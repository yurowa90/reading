"use client";

import { useState } from "react";
import { Card } from "@/components/ui";

/** 참여 코드는 교사에게만 표시된다(호출부에서 통제). 복사 버튼 제공. */
export function JoinCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card className="bg-brand-soft/40">
      <p className="text-xs font-semibold text-stone-500">학급 참여 코드</p>
      <div className="mt-1 flex items-center gap-3">
        <span className="font-mono text-2xl font-bold tracking-widest text-stone-800">{code}</span>
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
        >
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <p className="mt-2 text-xs text-stone-500">이 코드를 학생에게 공유하면 학급에 참여할 수 있습니다.</p>
    </Card>
  );
}
