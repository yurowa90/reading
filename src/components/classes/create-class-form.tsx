"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createClassSchema, type CreateClassInput } from "@/lib/validation/class";
import { createClassAction } from "@/actions/classes";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { Alert, Button } from "@/components/ui";

export function CreateClassForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateClassInput>({ resolver: zodResolver(createClassSchema) });

  function onSubmit(values: CreateClassInput) {
    setServerError(null);
    const fd = new FormData();
    fd.set("name", values.name);
    if (values.description) fd.set("description", values.description);
    startTransition(async () => {
      const result = await createClassAction(null, fd);
      if (!result.ok) {
        setServerError(result.message);
        return;
      }
      router.replace(`/classes/${result.data.classId}?created=1`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError ? <Alert tone="error">{serverError}</Alert> : null}
      <Field label="학급명" htmlFor="name" required error={errors.name?.message}>
        <input id="name" className={inputClass} {...register("name")} />
      </Field>
      <Field label="설명" htmlFor="description" error={errors.description?.message}
        hint="선택 입력 (최대 300자)">
        <textarea id="description" className={textareaClass} {...register("description")} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "생성 중…" : "학급 만들기"}
      </Button>
    </form>
  );
}
