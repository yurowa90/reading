"use client";

import type { ReactNode } from "react";

/** 폼 필드 래퍼: 라벨 + 컨트롤 + 필드 근처 오류 메시지. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-stone-700">
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-stone-500">{hint}</p> : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand";

export const textareaClass = `${inputClass} min-h-[96px] resize-y`;
