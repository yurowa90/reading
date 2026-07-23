"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitWorkAction, deleteWorkAction } from "@/actions/works";

export function SubmitWorkButton({ workId }: { workId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    const fd = new FormData();
    fd.set("workId", workId);
    startTransition(async () => {
      const result = await submitWorkAction(null, fd);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "제출 중…" : "제출"}
      </button>
      {error ? (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      ) : null}
    </span>
  );
}

export function DeleteWorkButton({ workId, classId }: { workId: string; classId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm("이 작품을 삭제할까요? 되돌릴 수 없습니다.")) return;
    const fd = new FormData();
    fd.set("workId", workId);
    fd.set("classId", classId);
    startTransition(async () => {
      await deleteWorkAction(fd);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
    >
      삭제
    </button>
  );
}
