import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "회원가입" };

export default function SignUpPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-stone-800">회원가입</h1>
      <SignUpForm />
    </div>
  );
}
