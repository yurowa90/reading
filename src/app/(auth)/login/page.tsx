import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-stone-800">로그인</h1>
      <LoginForm redirectTo={redirectTo} />
    </div>
  );
}
