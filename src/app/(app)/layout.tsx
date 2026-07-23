import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { requireProfile } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireProfile();
  return (
    <div className="min-h-screen">
      <AppHeader profile={profile} />
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
