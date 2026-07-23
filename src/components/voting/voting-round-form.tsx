"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createVotingRoundAction, endVotingRoundAction } from "@/actions/voting";
import { Field, inputClass } from "@/components/ui/field";
import { Alert, Button } from "@/components/ui";

export function VotingRoundForm({ classId }: { classId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setErrors({});
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createVotingRoundAction(classId, null, fd);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage({ tone: "error", text: result.message });
        return;
      }
      setMessage({ tone: "success", text: "평가 기간을 만들었습니다." });
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      <Field label="이름(선택)" htmlFor="label">
        <input id="label" name="label" className={inputClass} placeholder="예: 1학기 상호평가" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="시작 일시" htmlFor="opensAt" required error={errors.opensAt?.[0]}>
          <input id="opensAt" name="opensAt" type="datetime-local" required className={inputClass} />
        </Field>
        <Field label="종료 일시" htmlFor="closesAt" required error={errors.closesAt?.[0]}>
          <input id="closesAt" name="closesAt" type="datetime-local" required className={inputClass} />
        </Field>
      </div>
      <Field label="학생당 최소 평가 작품 수" htmlFor="minReviews" hint="0이면 제한 없음(안내용)">
        <input id="minReviews" name="minReviews" type="number" min={0} max={100} defaultValue={0} className={inputClass} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "생성 중…" : "평가 기간 만들기"}
      </Button>
    </form>
  );
}

export function EndRoundButton({ roundId, classId }: { roundId: string; classId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function onClick() {
    if (!window.confirm("이 평가 기간을 지금 종료할까요? 종료 후 결과가 공개됩니다.")) return;
    const fd = new FormData();
    fd.set("roundId", roundId);
    fd.set("classId", classId);
    startTransition(async () => {
      await endVotingRoundAction(fd);
      router.refresh();
    });
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
    >
      지금 종료
    </button>
  );
}
