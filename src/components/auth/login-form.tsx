"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { loginAction } from "@/actions/auth";
import { Field, inputClass } from "@/components/ui/field";
import { Alert, Button } from "@/components/ui";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  function onSubmit(values: LoginInput) {
    setServerError(null);
    const fd = new FormData();
    fd.set("email", values.email);
    fd.set("password", values.password);
    if (redirectTo) fd.set("redirectTo", redirectTo);

    startTransition(async () => {
      // 성공 시 서버 액션이 redirect 하므로 반환값은 오류일 때만 도달한다.
      const result = await loginAction(null, fd);
      if (result && !result.ok) setServerError(result.message);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError ? <Alert tone="error">{serverError}</Alert> : null}

      <Field label="이메일" htmlFor="email" required error={errors.email?.message}>
        <input id="email" type="email" className={inputClass} autoComplete="email"
          {...register("email")} />
      </Field>

      <Field label="비밀번호" htmlFor="password" required error={errors.password?.message}>
        <input id="password" type="password" className={inputClass}
          autoComplete="current-password" {...register("password")} />
      </Field>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "로그인 중…" : "로그인"}
      </Button>

      <p className="text-center text-sm text-stone-600">
        계정이 없나요?{" "}
        <Link href="/signup" className="font-semibold text-brand underline">
          회원가입
        </Link>
      </p>
    </form>
  );
}
