"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUpSchema, type SignUpInput } from "@/lib/validation/auth";
import { signUpAction } from "@/actions/auth";
import { Field, inputClass } from "@/components/ui/field";
import { Alert, Button } from "@/components/ui";

export function SignUpForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  function onSubmit(values: SignUpInput) {
    setServerError(null);
    const fd = new FormData();
    fd.set("displayName", values.displayName);
    fd.set("email", values.email);
    fd.set("password", values.password);
    fd.set("passwordConfirm", values.passwordConfirm);

    startTransition(async () => {
      const result = await signUpAction(null, fd);
      if (!result.ok) {
        setServerError(result.message);
        return;
      }
      if (result.data.needsEmailConfirm) {
        setEmailSent(true);
      } else {
        router.replace("/dashboard");
      }
    });
  }

  if (emailSent) {
    return (
      <Alert tone="success">
        인증 메일을 보냈습니다. 메일함에서 링크를 눌러 가입을 완료한 뒤 로그인하세요.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError ? <Alert tone="error">{serverError}</Alert> : null}

      <Field label="공개 이름(별칭)" htmlFor="displayName" required error={errors.displayName?.message}
        hint="학급에 표시되는 이름입니다. 실명 대신 별칭을 권장합니다.">
        <input id="displayName" className={inputClass} autoComplete="nickname"
          {...register("displayName")} />
      </Field>

      <Field label="이메일" htmlFor="email" required error={errors.email?.message}>
        <input id="email" type="email" className={inputClass} autoComplete="email"
          {...register("email")} />
      </Field>

      <Field label="비밀번호" htmlFor="password" required error={errors.password?.message}
        hint="8자 이상">
        <input id="password" type="password" className={inputClass} autoComplete="new-password"
          {...register("password")} />
      </Field>

      <Field label="비밀번호 확인" htmlFor="passwordConfirm" required
        error={errors.passwordConfirm?.message}>
        <input id="passwordConfirm" type="password" className={inputClass}
          autoComplete="new-password" {...register("passwordConfirm")} />
      </Field>

      <p className="text-xs text-stone-500">
        가입하면 학생으로 등록됩니다. 교사 권한은 별도 절차로만 부여됩니다.
      </p>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "가입 중…" : "회원가입"}
      </Button>

      <p className="text-center text-sm text-stone-600">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="font-semibold text-brand underline">
          로그인
        </Link>
      </p>
    </form>
  );
}
