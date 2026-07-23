# ARCHITECTURE.md — 시스템 구조

## 구성도

```
[브라우저] ── HTTPS ──> [Next.js (Vercel)]
   │  서버 컴포넌트 / 서버 액션 / 미들웨어      │
   │  @supabase/ssr (anon key, 쿠키 세션)       │
   └──────────────> [Supabase]
                     ├ Auth (이메일/비밀번호)
                     ├ PostgreSQL + RLS + RPC
                     └ Storage (Phase 2, private)
```

## Next.js와 Supabase의 역할 분담

- **Next.js**: 라우팅, 서버 렌더링, 서버 액션(폼 처리·검증), 세션 미들웨어, UI.
- **Supabase**: 인증, 데이터 저장, **권한(RLS)**, 학급 참여 RPC, (추후) 파일 저장.
- 권한의 최종 방어선은 언제나 DB(RLS)다. 앱 계층 검사는 UX 보조일 뿐이다.

## 인증 흐름

1. 회원가입/로그인은 서버 액션에서 `@supabase/ssr` 서버 클라이언트로 처리.
2. 세션은 쿠키에 저장. `middleware.ts`가 매 요청마다 `updateSession()`으로 갱신하고
   보호 라우트(`/dashboard`, `/classes`, `/sentences`, `/profile`, `/onboarding`) 접근을 통제.
3. 서버에서 사용자 확인은 `getUser()`(토큰 실검증)를 쓴다. `getSession()`은 위조 가능하므로
   권한 판단에 쓰지 않는다.
4. 회원가입 시 DB 트리거가 프로필을 생성(role=student 강제).

## 서버와 클라이언트 경계

- 기본은 **서버 컴포넌트**. 데이터 조회는 `features/*/queries.ts`(서버 전용).
- 상호작용이 필요한 폼만 **클라이언트 컴포넌트**(`"use client"`) + React Hook Form.
- 폼은 클라이언트에서 Zod로 1차 검증 후 **서버 액션에서 Zod로 재검증**한다.
- 서버 액션은 표준 `ActionResult`(`lib/actions/result.ts`)를 반환한다.

## 파일 업로드 흐름 (Phase 2, 설계)

브라우저 → 서버 액션이 서명 URL 발급 → private bucket 업로드 → 경로만 DB 저장.
경로에 개인정보 미포함, EXIF 제거, 교사 게시 승인 후에만 갤러리 노출.

## AI 기능 연결 구조 (Phase 5, 설계)

`lib/ai/` adapter 인터페이스(예: `generateSocraticQuestion(input): Promise<StageResult>`).
서버에서만 호출, 키는 서버 환경 변수. 응답은 Zod 스키마로 검증. 제공자 교체 가능.
학생 식별정보는 전송하지 않는다.

## 에러 처리

- 서버 액션: 예외를 삼키지 않고 `ActionResult`의 사용자 친화 메시지로 변환.
  인증 오류는 `mapAuthError`로 한국어화.
- 페이지: 없는 리소스는 `notFound()`. 미로그인은 미들웨어/`requireProfile()`가 리다이렉트.
- UI: 로딩·빈 화면·성공·오류 상태를 모두 렌더링. 오류는 `role="alert"`로 접근성 확보.

## 로깅 원칙

- 참여 코드 원문, 비밀번호, 토큰 등 민감값을 로그에 남기지 않는다.
- Phase 1은 서버 콘솔 최소 로깅. 운영 관측성은 Vercel/Supabase 기본 대시보드 사용.
