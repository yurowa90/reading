"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { joinClassSchema, type JoinClassInput } from "@/lib/validation/class";
import { joinClassAction } from "@/actions/classes";
import { Field, inputClass } from "@/components/ui/field";
import { Alert, Button } from "@/components/ui";

export function JoinClassForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinClassInput>({ resolver: zodResolver(joinClassSchema) });

  function onSubmit(values: JoinClassInput) {
    setServerError(null);
    setNotice(null);
    const fd = new FormData();
    fd.set("joinCode", values.joinCode);
    startTransition(async () => {
      const result = await joinClassAction(null, fd);
      if (!result.ok) {
        setServerError(result.message);
        return;
      }
      if (result.data.status === "already_member") {
        setNotice(`이미 '${result.data.className}' 학급에 참여 중입니다.`);
        router.push(`/classes/${result.data.classId}`);
        return;
      }
      router.replace(`/classes/${result.data.classId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError ? <Alert tone="error">{serverError}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <Field label="참여 코드" htmlFor="joinCode" required error={errors.joinCode?.message}
        hint="교사에게 받은 영문 대문자·숫자 8자리">
        <input id="joinCode" className={`${inputClass} uppercase tracking-widest`}
          autoCapitalize="characters" maxLength={8} {...register("joinCode")} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "참여 중…" : "학급 참여"}
      </Button>
    </form>
  );
}
