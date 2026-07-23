import Link from "next/link";
import { LinkButton } from "@/components/ui";
import { getSessionProfile } from "@/lib/auth/session";

export default async function LandingPage() {
  const session = await getSessionProfile();

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <header className="mb-10">
        <p className="text-sm font-semibold text-brand">학급 독서교육 웹앱</p>
        <h1 className="mt-2 text-3xl font-bold text-stone-800 sm:text-4xl">책갈피</h1>
        <p className="mt-4 text-stone-600">
          독서의 <strong>결과물</strong>보다 <strong>과정과 생각의 변화</strong>를 기록합니다.
          인상 깊은 문장을 모으고, 자신의 해석과 질문을 남기며, 그 근거 위에서 서평을 씁니다.
        </p>
      </header>

      <section className="mb-10 grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="font-semibold text-stone-800">{f.title}</h2>
            <p className="mt-1 text-sm text-stone-500">{f.body}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        {session ? (
          <LinkButton href="/dashboard">내 대시보드로</LinkButton>
        ) : (
          <>
            <LinkButton href="/signup">시작하기</LinkButton>
            <LinkButton href="/login" variant="secondary">
              로그인
            </LinkButton>
          </>
        )}
      </div>

      <footer className="mt-16 border-t border-stone-200 pt-6 text-sm text-stone-500">
        학생 작품은 기본적으로 <strong>학급 내부</strong>로만 공개됩니다.{" "}
        <Link href="/signup" className="underline">
          회원가입
        </Link>{" "}
        시 학생으로 등록됩니다.
      </footer>
    </main>
  );
}

const FEATURES = [
  { title: "문장 수집", body: "책 속 인상 깊은 문장과 그것을 고른 이유·해석을 모읍니다." },
  { title: "생각의 확장", body: "질문과 태그로 자신의 사고 과정을 남깁니다." },
  { title: "학급 안에서", body: "담당 교사와 같은 학급 안에서 안전하게 기록합니다." },
];
