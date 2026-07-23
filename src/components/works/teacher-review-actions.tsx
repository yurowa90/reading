"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveWorkAction, rejectWorkAction, hideWorkAction } from "@/actions/works";

/** 교사 검토 액션: 승인(게시)/반려(사유)/숨김. */
export function TeacherReviewActions({
  workId,
  status,
}: {
  workId: string;
  status: "submitted" | "published";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function call(kind: "approve" | "reject" | "hide") {
    setError(null);
    const fd = new FormData();
    fd.set("workId", workId);
    if (kind === "reject") fd.set("note", note);
    startTransition(async () => {
      const result =
        kind === "approve"
          ? await approveWorkAction(null, fd)
          : kind === "reject"
            ? await rejectWorkAction(null, fd)
            : await hideWorkAction(null, fd);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "submitted" ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => call("approve")}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              게시 승인
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setShowReject((s) => !s)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              반려
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => call("hide")}
            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            갤러리에서 내리기(숨김)
          </button>
        )}
      </div>

      {showReject ? (
        <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
          <label htmlFor={`note-${workId}`} className="block text-xs font-medium text-stone-600">
            반려 사유(학생에게 표시)
          </label>
          <textarea
            id={`note-${workId}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
            rows={2}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => call("reject")}
            className="rounded-lg bg-stone-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            반려 확정
          </button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
