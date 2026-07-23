"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createBookSchema, type CreateBookInput } from "@/lib/validation/book";
import { createBookAction } from "@/actions/books";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { Alert, Button } from "@/components/ui";

export function CreateBookForm({ classId }: { classId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateBookInput>({ resolver: zodResolver(createBookSchema) });

  function onSubmit(values: CreateBookInput) {
    setServerError(null);
    const fd = new FormData();
    fd.set("title", values.title);
    fd.set("author", values.author ?? "");
    fd.set("publisher", values.publisher ?? "");
    fd.set("isbn", values.isbn ?? "");
    fd.set("coverUrl", values.coverUrl ?? "");
    fd.set("description", values.description ?? "");
    startTransition(async () => {
      const result = await createBookAction(classId, null, fd);
      if (!result.ok) {
        setServerError(result.message);
        return;
      }
      router.replace(`/classes/${classId}/books`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError ? <Alert tone="error">{serverError}</Alert> : null}
      <Field label="제목" htmlFor="title" required error={errors.title?.message}>
        <input id="title" className={inputClass} {...register("title")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="저자" htmlFor="author" error={errors.author?.message}>
          <input id="author" className={inputClass} {...register("author")} />
        </Field>
        <Field label="출판사" htmlFor="publisher" error={errors.publisher?.message}>
          <input id="publisher" className={inputClass} {...register("publisher")} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ISBN" htmlFor="isbn" error={errors.isbn?.message}>
          <input id="isbn" className={inputClass} {...register("isbn")} />
        </Field>
        <Field label="표지 이미지 URL" htmlFor="coverUrl" error={errors.coverUrl?.message}
          hint="Phase 1 은 직접 업로드 대신 URL 입력">
          <input id="coverUrl" className={inputClass} inputMode="url" {...register("coverUrl")} />
        </Field>
      </div>
      <Field label="설명" htmlFor="description" error={errors.description?.message}>
        <textarea id="description" className={textareaClass} {...register("description")} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "등록 중…" : "도서 등록"}
      </Button>
    </form>
  );
}
