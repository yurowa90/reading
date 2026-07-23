"use client";

import { deleteSentenceAction } from "@/actions/sentences";

export function DeleteSentenceButton({
  sentenceId,
  classId,
}: {
  sentenceId: string;
  classId: string;
}) {
  return (
    <form
      action={deleteSentenceAction}
      onSubmit={(e) => {
        if (!window.confirm("이 문장 카드를 삭제할까요? 되돌릴 수 없습니다.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="sentenceId" value={sentenceId} />
      <input type="hidden" name="classId" value={classId} />
      <button
        type="submit"
        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        삭제
      </button>
    </form>
  );
}
