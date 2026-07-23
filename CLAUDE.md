# CLAUDE.md — 프로젝트 가이드

한국 고등학교 학급 독서교육 웹앱. 이 파일은 AI/개발자가 작업 시 먼저 읽는 요약이다.
상세 내용은 `docs/` 문서를 참조한다.

## 프로젝트 목적

독서의 **결과물**보다 **과정과 사고의 변화**를 기록한다. 흐름:
학급 참여 → 도서 선택 → 문장 수집 → 해석·질문 → (Phase 5 산파법 챗봇) → 서평 →
북포스터 → 학급 갤러리 → 상호 피드백 → 우수작 후보 → 교사 최종 선정 → 포트폴리오.

핵심 가치: AI가 서평을 대필하지 않는다 · 학생이 수집한 문장을 서평 근거로 연결한다 ·
공개 범위는 기본 학급 내부 · 좋아요/별점은 후보 추천에만 사용 · 교사가 통제한다.

## 기술 스택

- Next.js 15 (App Router) · React 19 · TypeScript strict
- Tailwind CSS 3 · Zod · React Hook Form
- Supabase (PostgreSQL · Auth · Storage · RLS)
- Vitest · React Testing Library · Playwright
- 배포: Vercel + Supabase Cloud / 패키지 관리자: npm

## 디렉터리 구조

```
src/
  app/            App Router 라우트 (그룹: (auth), (app))
  actions/        서버 액션 (auth, profile, classes, books, sentences)
  components/     UI (auth, classes, books, sentences, layout, ui)
  features/       기능별 데이터 조회 (classes, books, sentences)
  lib/            supabase, auth, validation, permissions, utils, actions
  types/          database.ts
  config/         env.ts
supabase/         migrations/ · seed.sql · tests/
tests/            unit/ · e2e/
docs/             PRD, ARCHITECTURE, ROADMAP, DATA_MODEL, SECURITY, UX_FLOW, TEST_PLAN, DEPLOYMENT
```

주의: 이 저장소에는 무관한 정적 앱(`index.html`, `README.essay-studio.md`)이 함께 있다.
독서앱과 무관하므로 건드리지 않는다.

## 주요 데이터 모델 (Phase 1)

`profiles`(id, display_name, role) · `classes`(name, teacher_id, join_code) ·
`class_members`(class_id, user_id, member_role, status) · `books`(class_id, ...) ·
`sentence_cards`(user_id, class_id, book_id, quote, reason, interpretation, ...).
상세는 `docs/DATA_MODEL.md`.

## 역할과 권한

- `user_role` enum: `student` | `teacher` | `admin`. **신규 가입자는 항상 `student`.**
- 교사 권한은 Supabase 관리 화면/서버 스크립트로만 부여한다(회원가입에서 선택 불가).
- 브라우저에서 사용자가 자기 역할을 바꿀 수 없다(열 수준 GRANT + RLS로 차단).

## 필수 보안 규칙

- 모든 public 테이블에 RLS 활성화. 화면 숨김이 아니라 DB 정책으로 통제.
- service role key를 브라우저 코드에서 절대 사용하지 않는다.
- 학생은 본인 문장 카드만 CRUD. 교사는 담당 학급 카드 조회만(수정 불가).
- 학급 참여는 RPC(`join_class_with_code`)로만. 클라이언트가 `classes`를 검색하지 않는다.
- SECURITY DEFINER 함수는 `search_path = ''` 고정 + 스키마 정규화(재귀 방지).
- 상세: `docs/SECURITY.md`.

## 실행 명령

```
npm install
cp .env.example .env.local   # 값 채우기
npm run dev                  # http://localhost:3000
```

## 테스트 명령

```
npm run lint
npm run typecheck
npm run test        # Vitest 단위 테스트
npm run test:e2e    # Playwright (로컬 Supabase 필요; 없으면 skip)
npm run build
```

## 현재 개발 단계

**Phase 1 완료.** 인증/프로필/학급/도서/문장카드 CRUD + RLS까지 구현.
Phase 2 이후(서평·북포스터·갤러리·댓글·좋아요·별점·우수작·AI 챗봇)는 문서 설계만 존재.

## 절대 하면 안 되는 작업

- Phase 2 이후 기능을 미리 구현하거나 작동하지 않는 버튼/빈 화면 만들기
- RLS 비활성화로 오류 회피 · service role key 클라이언트 노출
- 회원가입에서 교사 역할 선택 허용 · `any`로 타입 오류 우회
- 공개 버킷에 학생 포스터 저장 · force push · 비밀키 커밋
- 무관한 기존 정적 앱 파일 삭제/변경

## 다음 단계 진행 방법

`docs/ROADMAP.md`의 Phase 2 항목을 따른다. 새 테이블은 `supabase/migrations/`에
번호를 이어 추가하고, 반드시 RLS 정책과 거부 테스트를 함께 작성한다.
