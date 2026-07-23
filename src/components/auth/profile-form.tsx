"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileUpdateSchema, type ProfileUpdateInput } from "@/lib/validation/auth";
import { updateProfileAction } from "@/actions/profile";
import { Field, inputClass } from "@/components/ui/field";
import { Alert, Button } from "@/components/ui";

export function ProfileForm({ defaultName }: { defaultName: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: { displayName: defaultName },
  });

  function onSubmit(values: ProfileUpdateInput) {
    setMessage(null);
    const fd = new FormData();
    fd.set("displayName", values.displayName);
    startTransition(async () => {
      const result = await updateProfileAction(null, fd);
      setMessage(
        result.ok
          ? { tone: "success", text: "저장했습니다." }
          : { tone: "error", text: result.message },
      );
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      <Field label="공개 이름(별칭)" htmlFor="displayName" required error={errors.displayName?.message}>
        <input id="displayName" className={inputClass} {...register("displayName")} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "저장 중…" : "저장"}
      </Button>
    </form>
  );
}
