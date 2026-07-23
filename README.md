# 책갈피 — 학급 독서교육 웹앱

한국 고등학교 한 학급에서 시험 운영할 수 있는 독서교육 웹앱입니다.
독서의 **결과물**보다 **과정과 사고의 변화**를 기록하도록 설계했습니다.

> 이 저장소에는 이전의 무관한 정적 앱(`index.html`, `README.essay-studio.md`)이
> 함께 들어 있습니다. 독서앱과는 별개이며 그대로 보존됩니다.

## 현재 범위 (Phase 1–4)

- **Phase 1**: 인증 · 프로필 · 학급 생성/참여 · 도서 등록 · 문장 카드 CRUD · RLS.
- **Phase 2**: 서평(구조화/자유) · 북포스터 업로드(private bucket) · 제출/게시 승인 워크플로 ·
  학급 갤러리(필터·검색·무작위).
- **Phase 3**: 댓글/답글/신고/교사 숨김 · 좋아요 · 별점 · 상호평가 기간(기간 중 집계 비공개).
- **Phase 4**: 동료평가 기반 우수작 후보(베이지안 보정+정규화) · 교사 루브릭 · 최종 우수작 선정.

독서 산파법 AI 챗봇, 포트폴리오·통계 대시보드는 **아직 구현하지 않았고** `docs/`에 설계만 있습니다.
> Storage(포스터)와 RLS 정책은 실제 Supabase 없이 런타임 검증을 하지 못했습니다. 마이그레이션·버킷 설정 후 확인이 필요합니다.

## 기술 스택

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS · Zod ·
React Hook Form · Supabase (PostgreSQL/Auth/RLS) · Vitest · Playwright.

## 빠른 시작

사전 요구: Node.js 20+ (개발은 22에서 검증), npm, Supabase 프로젝트 1개.

```bash
# 1) 의존성 설치
npm install

# 2) 환경 변수 설정
cp .env.example .env.local
#   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_APP_URL 채우기

# 3) 데이터베이스 마이그레이션 적용 (아래 'Supabase 설정' 참고)

# 4) 개발 서버
npm run dev            # http://localhost:3000
```

## Supabase 설정

1. [supabase.com](https://supabase.com)에서 프로젝트를 만들고 URL·anon key를 `.env.local`에 넣습니다.
2. 마이그레이션을 순서대로 적용합니다. SQL Editor에 붙여넣거나 Supabase CLI를 사용합니다.

   ```bash
   # SQL Editor 사용 시 아래 파일을 순서대로 실행
   supabase/migrations/0001_init.sql
   supabase/migrations/0002_functions.sql
   supabase/migrations/0003_rls.sql
   supabase/migrations/0004_works.sql     # Phase 2: 서평/포스터
   supabase/migrations/0005_storage.sql   # Phase 2: posters private bucket + 정책
   supabase/migrations/0006_engagement.sql # Phase 3: 댓글/좋아요/별점/평가기간/신고
   supabase/migrations/0007_rubric.sql    # Phase 4: 교사 루브릭 + 우수작 선정
   ```

   `0005_storage.sql`는 private 버킷 `posters`와 Storage 정책을 만듭니다. 이미지 조회는
   서버가 생성한 서명 URL로만 이뤄집니다(공개 버킷 아님).

   또는 Supabase CLI:

   ```bash
   supabase link --project-ref <ref>
   supabase db push        # migrations 폴더 적용
   ```

3. **이메일 인증**: Authentication → Providers → Email. 로컬 시험 운영에서는
   "Confirm email"을 끄면 가입 즉시 로그인됩니다(운영 시에는 켜기 권장).
4. **최초 교사 계정 부여**: 회원가입 후 Table editor → `profiles`에서 해당 사용자의
   `role`을 `teacher`로 변경합니다. (일반 사용자는 스스로 변경할 수 없습니다.)

자세한 절차와 배포는 `docs/DEPLOYMENT.md`를 참고하세요.

## 명령어

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 실행 |
| `npm run lint` | ESLint |
| `npm run typecheck` | 타입 검사 |
| `npm run test` | 단위 테스트(Vitest) |
| `npm run test:e2e` | E2E(Playwright, 로컬 Supabase 필요) |
| `npm run format` / `format:check` | Prettier |

## 문서

- `docs/PRD.md` — 제품 요구사항
- `docs/ARCHITECTURE.md` — 시스템 구조
- `docs/ROADMAP.md` — 단계별 로드맵
- `docs/DATA_MODEL.md` — 전체 데이터 모델
- `docs/SECURITY.md` — 보안·RLS 정책
- `docs/UX_FLOW.md` — 화면 흐름
- `docs/TEST_PLAN.md` — 테스트 계획
- `docs/DEPLOYMENT.md` — 배포 절차
- `CLAUDE.md` — 개발 요약 가이드

## 보안 요약

- 모든 public 테이블에 RLS 활성화. 권한은 화면이 아니라 DB에서 통제합니다.
- 신규 사용자는 항상 학생입니다. 교사 권한은 관리자만 부여합니다.
- 학급 참여는 서버 RPC로만 처리하며 클라이언트가 학급 목록을 검색하지 않습니다.
- service role key는 클라이언트에서 사용하지 않으며 Phase 1에서는 요구하지 않습니다.

## 라이선스

시험 운영용 내부 프로젝트.
