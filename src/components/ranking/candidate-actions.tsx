"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RUBRIC_CRITERIA } from "@/lib/validation/rubric";
import { saveRubricAction, toggleFeaturedAction } from "@/actions/rubric";

export function CandidateActions({
  classId,
  workId,
  featured,
  rubric,
}: {
  classId: string;
  workId: string;
  featured: boolean;
  rubric: Record<string, number> | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function saveRubric(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    fd.set("workId", workId);
    startTransition(async () => {
      const result = await saveRubricAction(classId, null, fd);
      setMessage(result.ok ? "루브릭을 저장했습니다." : result.message);
      if (result.ok) router.refresh();
    });
  }

  function toggleFeatured() {
    const fd = new FormData();
    fd.set("workId", workId);
    fd.set("feature", featured ? "false" : "true");
    startTransition(async () => {
      const result = await toggleFeaturedAction(classId, null, fd);
      if (!result.ok) setMessage(result.message);
      else router.refresh();
    });
  }

  return (
    <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleFeatured}
          disabled={pending}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-60 ${
            featured
              ? "border border-amber-300 bg-amber-50 text-amber-800"
              : "bg-brand text-white hover:bg-emerald-800"
          }`}
        >
          {featured ? "★ 우수작 선정됨 (해제)" : "최종 우수작으로 선정"}
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          루브릭 {open ? "닫기" : "평가"}
        </button>
      </div>

      {open ? (
        <form onSubmit={saveRubric} className="space-y-2 rounded-lg bg-stone-50 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {RUBRIC_CRITERIA.map((c) => (
              <label key={c.key} className="text-sm text-stone-700">
                {c.label}
                <select
                  name={c.key}
                  defaultValue={String(rubric?.[c.key] ?? 0)}
                  className="mt-1 block w-full rounded border border-stone-300 px-2 py-1 text-sm"
                >
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <textarea
            name="comment"
            placeholder="평가 메모(선택)"
            rows={2}
            maxLength={1000}
            className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            루브릭 저장
          </button>
        </form>
      ) : null}

      {message ? (
        <p role="alert" className="text-xs text-stone-500">
          {message}
        </p>
      ) : null}
    </div>
  );
}
