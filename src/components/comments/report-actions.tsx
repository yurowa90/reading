"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCommentHiddenAction, resolveReportAction } from "@/actions/comments";

/** 교사 신고 처리: 댓글 숨김 + 신고 완료(resolved). */
export function ReportActions({
  reportId,
  commentId,
  workId,
  classId,
  commentHidden,
}: {
  reportId: string;
  commentId: string;
  workId: string;
  classId: string;
  commentHidden: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function hide() {
    const fd = new FormData();
    fd.set("commentId", commentId);
    fd.set("workId", workId);
    fd.set("hide", commentHidden ? "false" : "true");
    startTransition(async () => {
      await setCommentHiddenAction(null, fd);
      router.refresh();
    });
  }

  function resolve() {
    const fd = new FormData();
    fd.set("reportId", reportId);
    fd.set("classId", classId);
    startTransition(async () => {
      await resolveReportAction(null, fd);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={hide}
        disabled={pending}
        className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
      >
        {commentHidden ? "숨김 해제" : "댓글 숨기기"}
      </button>
      <button
        type="button"
        onClick={resolve}
        disabled={pending}
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        신고 처리 완료
      </button>
    </div>
  );
}
