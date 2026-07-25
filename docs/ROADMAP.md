# ROADMAP.md — 개발 로드맵

각 단계: 목표 · 구현 기능 · 변경 예상 파일 · DB 변경 · 테스트 · 완료 기준 · 위험.

## Phase 0 — 준비 ✅ 완료
- **목표**: 저장소 검사, 문서, 개발 환경.
- **구현**: Next.js/TS/Tailwind/Supabase/Vitest/Playwright 설정, 문서 8종.
- **파일**: package.json, 각종 config, `docs/*`, `CLAUDE.md`.
- **완료 기준**: `lint`/`typecheck`/`build` 통과, 문서 존재.

## Phase 1 — 인증·학급·문장 수집 ✅ 완료
- **목표**: 실제 학급에서 문장 수집까지 운영 가능.
- **구현**: 인증/프로필, 학급 생성/참여(RPC), 도서 등록/목록, 문장 카드 CRUD.
- **파일**: `src/app/(auth|app)/**`, `src/actions/**`, `src/features/**`, `src/components/**`.
- **DB**: `0001_init` · `0002_functions` · `0003_rls` (profiles/classes/class_members/books/sentence_cards).
- **테스트**: Zod·태그·역할·참여코드 단위 테스트, RLS 거부 시나리오, E2E 스켈레톤.
- **완료 기준**: `docs/PRD.md` 인수 조건 + 루트 프롬프트 §19 전 항목.
- **위험**: 로컬 Supabase 없이는 RLS/E2E 자동화 불가 → 수동 절차 문서화.

## Phase 2 — 서평·북포스터·갤러리 ✅ 완료
- **목표**: 작품 제출과 학급 내부 갤러리.
- **구현**: 서평(구조화 7섹션/자유 모드, 임시저장·미리보기·수집문장 삽입),
  북포스터 업로드(클라이언트 EXIF 제거·썸네일·private bucket), 제출 워크플로
  (draft→submitted→published/rejected, published→hidden), 교사 검토 큐(승인/반려/숨김),
  학급 갤러리(종류·도서·검색·무작위 필터, 별칭 표시).
- **파일**: `src/app/(app)/classes/[classId]/{works,gallery,pending}/**`,
  `src/app/(app)/works/[workId]/**`, `src/actions/{works,posters}.ts`,
  `src/features/works/**`, `src/components/works/**`.
- **DB**: `0004_works.sql`(works + 상태 enum + RLS), `0005_storage.sql`(private bucket + storage RLS).
- **테스트**: 서평 제출 완성도 검증 단위 테스트, 상태 전이·가시성 RLS 시나리오(문서).
- **미검증**: Storage 런타임은 로컬 Supabase 미구성으로 실행하지 못함(코드/정책/절차만 제공).
- **위험**: 이미지 EXIF/개인정보(→ canvas 재인코딩으로 제거), 파일 경로 노출(→ uuid 경로).

## Phase 3 — 상호 피드백 ✅ 완료
- **구현**: 댓글/답글/수정/삭제, 입력 기본 틀, 신고, 교사 숨김, 좋아요(토글·중복 방지),
  별점(1–5·수정 가능), 상호평가 기간(교사 설정·즉시 종료), 평가 기간 중 집계 비공개.
- **파일**: `src/actions/{engagement,comments,voting}.ts`, `src/features/{engagement,comments}/**`,
  `src/components/{engagement,comments,voting}/**`, `src/app/(app)/classes/[classId]/{voting,reports}/**`,
  작품 상세(`works/[workId]`)에 좋아요·별점·댓글 통합.
- **DB**: `0006_engagement.sql` — `comments`, `likes`(복합 PK), `ratings`(check+복합 PK),
  `reports`(unique), `voting_rounds` + 공정성 헬퍼(자기작품 금지·평가기간·결과공개) + RLS + 레이트리밋 트리거.
- **공정성**: 자기 작품 좋아요/별점 금지(RLS), 중복 차단(복합 PK), 연속 등록 5초 제한(트리거),
  평가 기간 중 타인 집계 RLS 차단, 평균은 최소 평가 수(3) 이상일 때만 공개.
- **테스트**: 댓글·별점·평가기간 검증 단위 테스트, RLS 거부 시나리오(문서).
- **미검증**: RLS/트리거 런타임은 로컬 Supabase 미구성으로 실행하지 못함(정책·절차만).

## Phase 4 — 우수작 후보 ✅ 완료
- **구현**: 베이지안 보정 별점 + 정규화 좋아요 → 동료평가 후보 점수(`0.7·정규화보정 + 0.3·정규화좋아요`),
  최소 평가 수(3) 게이트, 상위 20% 후보 표시, 교사 루브릭(3항목·메모), 최종 우수작 선정(featured),
  갤러리·작품 상세에 우수작 배지.
- **파일**: `src/lib/ranking/candidates.ts`(순수 함수), `src/features/ranking/queries.ts`,
  `src/actions/rubric.ts`, `src/components/ranking/candidate-actions.tsx`,
  `src/app/(app)/classes/[classId]/candidates/**`.
- **DB**: `0007_rubric.sql` — `teacher_rubric_scores`(교사 전용 RLS) + `works.featured_at/featured_by`.
- **테스트**: 베이지안·정규화·후보 상위20%·최소 평가 수 게이트 단위 테스트 15케이스(실제 검증).
- **공정성**: "우수작"이 아니라 "동료평가 기반 우수작 후보"로 표시, 자동 확정하지 않고 교사가 최종 선정.
- **미검증**: 집계/루브릭 RLS 런타임은 로컬 Supabase 미구성으로 미실행(정책·절차만).

## Phase 5 — 독서 산파법 챗봇 ✅ 완료
- **구현**: OBSERVE→INTERPRET→EVIDENCE→COUNTERARGUMENT→CONNECT→ORGANIZE→COMPLETE,
  한 번에 질문 하나(구조화 응답), 학생 답변이 있어야 다음 단계 진행, 대필 차단,
  Zod 응답 검증, 제공자 교체 adapter, **Google Gemini** 연동(서버 env 키) + mock 폴백.
- **파일**: `src/lib/ai/**`(types·prompt·provider·gemini·mock·config), `src/actions/chat.ts`,
  `src/features/chat/queries.ts`, `src/components/chat/**`,
  `src/app/(app)/classes/[classId]/chat/**`, `src/app/(app)/chat/[sessionId]/**`.
- **DB**: `0008_chat.sql` — `chat_sessions`, `chat_messages`, socratic_stage enum + RLS.
- **안전장치**: 키는 서버 env(`AI_API_KEY`)만, 학생 식별정보 미전송(책 제목·답변·수집문장만),
  단계 진행은 서버가 고정 순서로 강제(모델 값 무시), 응답 스키마 위반 시 mock 폴백.
- **테스트**: 단계 진행·응답 스키마·mock 생성 단위 테스트(실제 검증).
- **미검증**: 실제 Gemini 호출은 키가 있어야 동작(이 환경엔 키 없음 → mock으로 동작/검증).

## Phase 6 — 포트폴리오·운영 (진행 중)
- **완료**: 학생 독서 포트폴리오(문장·작품·대화 요약, 인쇄/PDF 내보내기),
  교사 학급 대시보드(참여 통계·학생별 활동표·학생 포트폴리오 열람), 통계 집계 순수 함수+테스트, 인쇄용 CSS.
- **파일**: `src/lib/stats/summary.ts`, `src/features/{portfolio,dashboard}/queries.ts`,
  `src/app/(app)/classes/[classId]/{portfolio,dashboard}/**`, `src/components/layout/print-button.tsx`.
- **DB**: 신규 테이블 없음(기존 테이블 조회·집계).
- **남은 항목**: 알림(notifications), 접근성 자동 점검(axe), 성능 측정(Lighthouse/번들 예산),
  PDF 서버 렌더(현재는 브라우저 인쇄로 대체), 운영 배포 리허설.
- **테스트**: 집계 순수 함수 단위 테스트(실제 검증). 접근성/성능은 수동 절차 문서화(향후 자동화).
