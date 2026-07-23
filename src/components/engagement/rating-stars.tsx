"use client";

import { useState, useTransition } from "react";
import { setRatingAction } from "@/actions/engagement";

export function RatingStars({
  workId,
  myRating,
  avg,
  ratingCount,
  revealed,
  canRate,
}: {
  workId: string;
  myRating: number | null;
  avg: number | null;
  ratingCount: number;
  revealed: boolean;
  canRate: boolean;
}) {
  const [current, setCurrent] = useState<number | null>(myRating);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function rate(score: number) {
    if (!canRate) return;
    setError(null);
    const fd = new FormData();
    fd.set("workId", workId);
    fd.set("score", String(score));
    startTransition(async () => {
      const result = await setRatingAction(null, fd);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setCurrent(score);
    });
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <div className="inline-flex items-center gap-1" role="group" aria-label="별점">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => rate(n)}
            disabled={!canRate || pending}
            aria-label={`${n}점`}
            aria-pressed={current === n}
            className={`text-xl leading-none ${
              current !== null && n <= current ? "text-amber-500" : "text-stone-300"
            } ${canRate ? "hover:text-amber-400" : "cursor-default"}`}
          >
            ★
          </button>
        ))}
        {current !== null ? (
          <span className="ml-1 text-xs text-stone-500">내 별점 {current}</span>
        ) : null}
      </div>
      {revealed ? (
        <span className="text-xs text-stone-500">
          {avg !== null ? `평균 ${avg} (${ratingCount}명)` : `평가 ${ratingCount}명 · 평균은 최소 인원 이상일 때 공개`}
        </span>
      ) : (
        <span className="text-xs text-stone-400">평가 기간 중 결과 비공개</span>
      )}
      {error ? (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      ) : null}
    </div>
  );
}
