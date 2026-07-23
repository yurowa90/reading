"use client";

import { useState, useTransition } from "react";
import { toggleLikeAction } from "@/actions/engagement";

export function LikeButton({
  workId,
  initialLiked,
  count,
  revealed,
  canRate,
}: {
  workId: string;
  initialLiked: boolean;
  count: number;
  revealed: boolean;
  canRate: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!canRate) return;
    setError(null);
    const fd = new FormData();
    fd.set("workId", workId);
    startTransition(async () => {
      const result = await toggleLikeAction(null, fd);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setLiked(result.data.liked);
    });
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={!canRate || pending}
        aria-pressed={liked}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
          liked
            ? "border-rose-300 bg-rose-50 text-rose-700"
            : "border-stone-300 bg-white text-stone-600"
        } ${canRate ? "hover:bg-stone-50" : "cursor-default opacity-80"}`}
      >
        <span aria-hidden>{liked ? "♥" : "♡"}</span>
        <span>좋아요{liked ? " 취소" : ""}</span>
        {revealed ? <span className="text-stone-400">· {count}</span> : null}
      </button>
      {!revealed ? <span className="text-xs text-stone-400">평가 기간 중 집계 비공개</span> : null}
      {error ? (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      ) : null}
    </div>
  );
}
