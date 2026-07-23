"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { SECTION_LABELS } from "@/lib/validation/work";
import type { ReviewSections, WorkMode } from "@/types/database";
import { saveReviewAction, submitWorkAction } from "@/actions/works";
import type { FieldErrors } from "@/lib/actions/result";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { Alert, Button } from "@/components/ui";

export interface BookOption {
  id: string;
  title: string;
}
export interface QuoteOption {
  id: string;
  quote: string;
  page: string | null;
}

interface FormShape {
  bookId: string;
  mode: WorkMode;
  title: string;
  body: string;
  sections: ReviewSections;
}

const SECTION_ORDER: (keyof ReviewSections)[] = [
  "one_line",
  "key_problem",
  "impressive_sentence",
  "author_judgment",
  "disagreement",
  "connection",
  "final_evaluation",
];

const emptySections: ReviewSections = {
  one_line: "",
  key_problem: "",
  impressive_sentence: "",
  author_judgment: "",
  disagreement: "",
  connection: "",
  final_evaluation: "",
};

export function ReviewForm({
  classId,
  workId,
  books,
  quotes,
  defaultValues,
}: {
  classId: string;
  workId?: string;
  books: BookOption[];
  quotes: QuoteOption[];
  defaultValues?: Partial<FormShape>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [preview, setPreview] = useState(false);

  const { register, handleSubmit, watch, getValues, setValue } = useForm<FormShape>({
    defaultValues: {
      bookId: defaultValues?.bookId ?? "",
      mode: defaultValues?.mode ?? "structured",
      title: defaultValues?.title ?? "",
      body: defaultValues?.body ?? "",
      sections: { ...emptySections, ...(defaultValues?.sections ?? {}) },
    },
  });

  const mode = watch("mode");

  function buildFormData(values: FormShape): FormData {
    const fd = new FormData();
    fd.set("bookId", values.bookId);
    fd.set("mode", values.mode);
    fd.set("title", values.title ?? "");
    fd.set("body", values.body ?? "");
    for (const key of SECTION_ORDER) fd.set(`sections.${key}`, values.sections[key] ?? "");
    return fd;
  }

  function insertQuote(q: QuoteOption) {
    const snippet = `“${q.quote}”${q.page ? ` (${q.page})` : ""}\n`;
    if (getValues("mode") === "free") {
      setValue("body", `${getValues("body") ?? ""}${snippet}`);
    } else {
      const cur = getValues("sections.impressive_sentence") ?? "";
      setValue("sections.impressive_sentence", `${cur}${snippet}`);
    }
  }

  function run(action: "save" | "submit", values: FormShape) {
    setMessage(null);
    setServerErrors({});
    startTransition(async () => {
      const saved = await saveReviewAction(classId, workId ?? null, null, buildFormData(values));
      if (!saved.ok) {
        setServerErrors(saved.fieldErrors ?? {});
        setMessage({ tone: "error", text: saved.message });
        return;
      }
      if (action === "save") {
        setMessage({ tone: "success", text: "임시 저장했습니다." });
        if (!workId) router.replace(`/works/${saved.data.workId}/edit`);
        return;
      }
      const fd = new FormData();
      fd.set("workId", saved.data.workId);
      const submitted = await submitWorkAction(null, fd);
      if (!submitted.ok) {
        setServerErrors(submitted.fieldErrors ?? {});
        setMessage({ tone: "error", text: submitted.message });
        return;
      }
      router.replace(`/classes/${classId}/works`);
    });
  }

  return (
    <form className="space-y-4" noValidate>
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <Field label="도서" htmlFor="bookId" required error={serverErrors.bookId?.[0]}>
        <select id="bookId" className={inputClass} {...register("bookId")}>
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

      <fieldset className="flex gap-4">
        <legend className="mb-1 text-sm font-medium text-stone-700">작성 모드</legend>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" value="structured" {...register("mode")} /> 구조화 모드
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" value="free" {...register("mode")} /> 자유 작성
        </label>
      </fieldset>

      {quotes.length > 0 ? (
        <details className="rounded-lg border border-stone-200 bg-stone-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-stone-700">
            내 수집 문장 삽입 ({quotes.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {quotes.map((q) => (
              <li key={q.id} className="flex items-start justify-between gap-2 text-sm">
                <span className="line-clamp-1 text-stone-600">“{q.quote}”</span>
                <button
                  type="button"
                  onClick={() => insertQuote(q)}
                  className="shrink-0 rounded border border-stone-300 bg-white px-2 py-0.5 text-xs"
                >
                  삽입
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {mode === "free" ? (
        <>
          <Field label="제목" htmlFor="title" error={serverErrors.title?.[0]}>
            <input id="title" className={inputClass} {...register("title")} />
          </Field>
          {preview ? (
            <div className="rounded-lg border border-stone-200 bg-white p-3">
              <p className="whitespace-pre-wrap text-sm text-stone-800">
                {watch("body") || "(본문 미리보기)"}
              </p>
            </div>
          ) : (
            <Field label="본문" htmlFor="body" error={serverErrors.body?.[0]}>
              <textarea id="body" className={`${textareaClass} min-h-[220px]`} {...register("body")} />
            </Field>
          )}
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="text-sm text-brand underline"
          >
            {preview ? "편집으로" : "미리보기"}
          </button>
        </>
      ) : (
        <div className="space-y-3">
          {SECTION_ORDER.map((key) => (
            <Field
              key={key}
              label={`${SECTION_ORDER.indexOf(key) + 1}. ${SECTION_LABELS[key]}`}
              htmlFor={`sections.${key}`}
              error={serverErrors[`sections.${key}`]?.[0]}
            >
              <textarea
                id={`sections.${key}`}
                className={textareaClass}
                {...register(`sections.${key}` as const)}
              />
            </Field>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={handleSubmit((v) => run("save", v))}
        >
          {pending ? "처리 중…" : "임시 저장"}
        </Button>
        <Button type="button" disabled={pending} onClick={handleSubmit((v) => run("submit", v))}>
          {pending ? "처리 중…" : "제출"}
        </Button>
      </div>
      <p className="text-xs text-stone-500">
        제출하면 교사의 게시 승인 후 학급 갤러리에 공개됩니다. AI가 대신 작성하지 않습니다.
      </p>
    </form>
  );
}
