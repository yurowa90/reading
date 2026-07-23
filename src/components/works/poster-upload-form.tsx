"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createPosterDraftAction, attachPosterAction } from "@/actions/posters";
import { Field, inputClass } from "@/components/ui/field";
import { Alert, Button } from "@/components/ui";
import type { BookOption } from "@/components/works/review-form";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const BUCKET = "posters";

interface FormShape {
  bookId: string;
  title: string;
}

/**
 * 이미지를 canvas 로 다시 그려 EXIF(위치정보 포함) 메타데이터를 제거하고 webp 로 재인코딩한다.
 * maxDim 으로 최대 변을 제한한다.
 */
async function reencode(file: File, maxDim: number, quality: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
      el.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("캔버스를 사용할 수 없습니다.");
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (!blob) throw new Error("이미지 변환에 실패했습니다.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PosterUploadForm({ classId, books }: { classId: string; books: BookOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormShape>({ defaultValues: { bookId: "", title: "" } });

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const f = e.target.files?.[0] ?? null;
    if (f) {
      if (!ALLOWED.includes(f.type)) {
        setFileError("JPG, PNG, WebP 형식만 업로드할 수 있습니다.");
        setFile(null);
        return;
      }
      if (f.size > MAX_BYTES) {
        setFileError("파일 크기는 최대 10MB 입니다.");
        setFile(null);
        return;
      }
    }
    setFile(f);
  }

  function onSubmit(values: FormShape) {
    setMessage(null);
    if (!file) {
      setFileError("포스터 이미지를 선택하세요.");
      return;
    }
    startTransition(async () => {
      try {
        setStatus("이미지 처리 중…");
        const original = await reencode(file, 1600, 0.85);
        const thumb = await reencode(file, 480, 0.8);

        setStatus("초안 생성 중…");
        const fd = new FormData();
        fd.set("bookId", values.bookId);
        fd.set("title", values.title ?? "");
        const draft = await createPosterDraftAction(classId, null, fd);
        if (!draft.ok) {
          setMessage(draft.message);
          setStatus(null);
          return;
        }
        const workId = draft.data.workId;
        const path = `${classId}/${workId}.webp`;
        const thumbPath = `${classId}/${workId}_thumb.webp`;

        setStatus("업로드 중…");
        const supabase = createClient();
        const up1 = await supabase.storage
          .from(BUCKET)
          .upload(path, original, { contentType: "image/webp", upsert: true });
        const up2 = await supabase.storage
          .from(BUCKET)
          .upload(thumbPath, thumb, { contentType: "image/webp", upsert: true });
        if (up1.error || up2.error) {
          setMessage("이미지 업로드에 실패했습니다. 저장소 설정을 확인하세요.");
          setStatus(null);
          return;
        }

        setStatus("연결 중…");
        const attached = await attachPosterAction(workId, path, thumbPath);
        if (!attached.ok) {
          setMessage(attached.message);
          setStatus(null);
          return;
        }
        router.replace(`/classes/${classId}/works`);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다.");
        setStatus(null);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {message ? <Alert tone="error">{message}</Alert> : null}

      <Field label="도서" htmlFor="bookId" required error={errors.bookId?.message}>
        <select id="bookId" className={inputClass} {...register("bookId", { required: "도서를 선택하세요." })}>
          <option value="" disabled>
            도서를 선택하세요
          </option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </Field>

      <Field label="제목" htmlFor="title">
        <input id="title" className={inputClass} {...register("title")} />
      </Field>

      <Field
        label="포스터 이미지"
        htmlFor="poster"
        required
        error={fileError ?? undefined}
        hint="JPG·PNG·WebP, 최대 10MB, 세로형(2:3 또는 A4) 권장. 업로드 시 위치정보(EXIF)는 자동 제거됩니다."
      >
        <input
          id="poster"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onPick}
          className="block w-full text-sm"
        />
      </Field>

      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        얼굴·실명 등 개인정보가 포스터에 드러나지 않도록 주의하세요. 업로드한 이미지는 학급 내부에서만
        공개되며, 교사의 게시 승인 후 갤러리에 노출됩니다.
      </p>

      <Button type="submit" disabled={pending}>
        {pending ? (status ?? "처리 중…") : "업로드"}
      </Button>
    </form>
  );
}
