# 개발 안내

사용자용 안내는 [README](../README.md)에 있습니다. 이 문서는 코드를 고치는 사람을 위한 내용입니다. 작업 규칙 요약은 저장소 루트의 `CLAUDE.md`를 따릅니다.

## 기술 스택

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS · Zod · React Hook Form · Supabase (PostgreSQL/Auth/Storage/RLS) · Vitest · Playwright. 패키지 관리자는 npm입니다. Node.js 20 이상이 필요하고, 개발은 22에서 확인했습니다.

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

## 단계별 구현 범위

- **Phase 1**: 인증 · 프로필 · 학급 생성/참여 · 도서 등록 · 문장 카드 CRUD · RLS.
- **Phase 2**: 서평(구조화/자유) · 북포스터 업로드(private bucket) · 제출/게시 승인 워크플로 · 학급 갤러리(필터·검색·무작위).
- **Phase 3**: 댓글/답글/신고/교사 숨김 · 좋아요 · 별점 · 상호평가 기간(기간 중 집계 비공개).
- **Phase 4**: 동료평가 기반 우수작 후보(베이지안 보정+정규화) · 교사 루브릭 · 최종 우수작 선정.
- **Phase 5**: 독서 산파법 챗봇(7단계·한 번에 질문 하나·대필 차단) · Google Gemini 연동(mock 폴백).
- **Phase 6(진행 중)**: 학생 독서 포트폴리오 · 교사 대시보드/통계 · 인쇄(PDF) 내보내기. 남은 항목은 [ROADMAP](ROADMAP.md)에 있습니다.

## 마이그레이션

`supabase/migrations/`의 파일을 번호 순서대로 적용합니다.

```
0001_init.sql
0002_functions.sql
0003_rls.sql
0004_works.sql        # Phase 2: 서평/포스터
0005_storage.sql      # Phase 2: posters private bucket + 정책
0006_engagement.sql   # Phase 3: 댓글/좋아요/별점/평가기간/신고
0007_rubric.sql       # Phase 4: 교사 루브릭 + 우수작 선정
0008_chat.sql         # Phase 5: 산파법 챗봇 세션/메시지
```

`0005_storage.sql`은 private 버킷 `posters`와 Storage 정책을 만듭니다. 이미지 조회는 서버가 생성한 서명 URL로만 합니다. 새 테이블은 번호를 이어 추가하고 RLS 정책과 거부 테스트를 함께 넣습니다.

## 검증 상태

- 마이그레이션(0001~0008)과 핵심 RLS 시나리오를 로컬 Postgres에서 실행해 통과했습니다: `bash supabase/tests/validate_local.sh`.
- Gemini 실호출을 확인했습니다.
- Storage 실버킷 런타임은 실제 Supabase에서 확인이 필요합니다(정책 SQL은 적용 검증됨).

## 문서

- [PRD.md](PRD.md) — 제품 요구사항
- [ARCHITECTURE.md](ARCHITECTURE.md) — 시스템 구조
- [ROADMAP.md](ROADMAP.md) — 단계별 로드맵
- [DATA_MODEL.md](DATA_MODEL.md) — 데이터 모델
- [SECURITY.md](SECURITY.md) — 보안·RLS 정책
- [UX_FLOW.md](UX_FLOW.md) — 화면 흐름
- [TEST_PLAN.md](TEST_PLAN.md) — 테스트 계획
- [DEPLOYMENT.md](DEPLOYMENT.md) — 배포 절차
