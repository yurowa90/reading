import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** 공용 UI 프리미티브(경량). 외부 UI 라이브러리 없이 Tailwind 로만 구성. */

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-4">
      <div>
        <h1 className="text-xl font-bold text-stone-800 sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-stone-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

const variants = {
  primary: "bg-brand text-white hover:bg-emerald-800",
  secondary: "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50",
  danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50",
} as const;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof variants }) {
  return <button className={`${buttonBase} ${variants[variant]} ${className}`} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof variants }) {
  return <Link className={`${buttonBase} ${variants[variant]} ${className}`} {...props} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-8 text-center">
      <p className="font-semibold text-stone-700">{title}</p>
      {description ? <p className="mt-1 text-sm text-stone-500">{description}</p> : null}
    </div>
  );
}

/** role="alert" 로 스크린리더에도 전달. 색상만으로 상태를 구분하지 않도록 접두 문구 포함. */
export function Alert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const styles =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";
  const label = tone === "error" ? "오류: " : "완료: ";
  return (
    <div role="alert" className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>
      <span className="font-semibold">{label}</span>
      {children}
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-emerald-900">
      {children}
    </span>
  );
}
