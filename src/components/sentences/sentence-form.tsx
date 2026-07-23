"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { sentenceCardSchema } from "@/lib/validation/sentence";
import { normalizeTags } from "@/lib/utils/tags";
import { createSentenceAction, updateSentenceAction } from "@/actions/sentences";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { Alert, Button } from "@/components/ui";

// 폼 자체는 태그를 문자열로 다루므로 zod 스키마와 별도의 폼 타입을 쓴다.
interface FormValues {
  bookId: string;
  quote: string;
  pageReference?: string;
  reason: string;
  interpretation: string;
  question?: string;
  tagsText?: string;
}

export interface BookOption {
  id: string;
  title: string;
}

export function SentenceForm({
  mode,
  classId,
  sentenceId,
  books,
  defaultValues,
}: {
  mode: "create" | "edit";
  classId: string;
  sentenceId?: string;
  books: BookOption[];
  defaultValues?: Partial<FormValues>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    // 클라이언트 검증: 태그를 정규화한 뒤 zod 스키마로 확인한다.
    resolver: async (values) => {
      const parsed = sentenceCardSchema.safeParse({
        ...values,
        tags: normalizeTags(values.tagsText ?? ""),
      });
      if (parsed.success) return { values, errors: {} };
      const fieldErrors: Record<string, { type: string; message: string }> = {};
      for (const issue of parsed.error.issues) {
        const rawKey = issue.path[0];
        // 폼에서 태그는 tagsText 필드로 다루므로 오류 키를 매핑한다.
        const key = rawKey === "tags" ? "tagsText" : rawKey;
        if (typeof key === "string" && !fieldErrors[key]) {
          fieldErrors[key] = { type: "validate", message: issue.message };
        }
      }
      return { values: {}, errors: fieldErrors };
    },
    defaultValues,
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    const fd = new FormData();
    fd.set("bookId", values.bookId);
    fd.set("quote", values.quote);
    fd.set("pageReference", values.pageReference ?? "");
    fd.set("reason", values.reason);
    fd.set("interpretation", values.interpretation);
    fd.set("question", values.question ?? "");
    fd.set("tags", values.tagsText ?? "");

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createSentenceAction(classId, null, fd)
          : await updateSentenceAction(sentenceId ?? "", null, fd);
      if (!result.ok) {
        setServerError(result.message);
        return;
      }
      router.replace(`/classes/${classId}/sentences`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError ? <Alert tone="error">{serverError}</Alert> : null}

      <Field label="도서" htmlFor="bookId" required error={errors.bookId?.message}>
        <select id="bookId" className={inputClass} defaultValue="" {...register("bookId")}>
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

      <Field label="수집한 문장" htmlFor="quote" required error={errors.quote?.message}>
        <textarea id="quote" className={textareaClass} {...register("quote")} />
      </Field>

      <Field label="쪽수 또는 위치" htmlFor="pageReference" error={errors.pageReference?.message}
        hint="예: 73쪽, 3장 도입부, 전자책 위치 512">
        <input id="pageReference" className={inputClass} {...register("pageReference")} />
      </Field>

      <Field label="이 문장을 고른 이유" htmlFor="reason" required error={errors.reason?.message}>
        <textarea id="reason" className={textareaClass} {...register("reason")} />
      </Field>

      <Field label="자신의 해석" htmlFor="interpretation" required
        error={errors.interpretation?.message}>
        <textarea id="interpretation" className={textareaClass} {...register("interpretation")} />
      </Field>

      <Field label="떠오른 질문" htmlFor="question" error={errors.question?.message}>
        <textarea id="question" className={textareaClass} {...register("question")} />
      </Field>

      <Field label="태그" htmlFor="tagsText" error={errors.tagsText?.message}
        hint="쉼표 또는 공백으로 구분 (최대 8개). 예: 책임, 선택, 공동체">
        <input id="tagsText" className={inputClass} {...register("tagsText")} />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "저장 중…" : mode === "create" ? "문장 카드 저장" : "수정 저장"}
      </Button>
    </form>
  );
}
