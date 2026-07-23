import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-6 block text-center text-lg font-bold text-brand">
        책갈피
      </Link>
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">{children}</div>
    </main>
  );
}
