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

## Phase 3 — 상호 피드백
- **구현**: 댓글/답글/수정/삭제/신고/교사 숨김, 좋아요(중복 방지), 별점(1–5), 평가 기간.
- **DB**: `comments`, `likes`(unique), `ratings`(check+unique), `reports`, `voting_rounds`.
- **테스트**: 자기 작품 좋아요/별점 금지, 중복 차단(제약조건), 연속 등록 제한.

## Phase 4 — 우수작 후보
- **구현**: 베이지안 보정 별점 + 정규화 좋아요 → 후보 점수, 상위 20% 후보 표시,
  결과 숨김, 무작위 노출, 교사 루브릭, 최종 선정.
- **DB**: `teacher_rubric_scores`, 집계 뷰/함수.
- **테스트**: 최소 평가 수 게이트, 공정성(자기 평가 금지), 점수 계산.

## Phase 5 — 독서 산파법 챗봇
- **구현**: OBSERVE→INTERPRET→EVIDENCE→COUNTERARGUMENT→CONNECT→ORGANIZE→COMPLETE,
  한 번에 질문 하나, 답변 기록, 대필 차단, Zod 응답 검증, adapter 구조.
- **DB**: `chat_sessions`, `chat_messages`.
- **테스트**: 대필 요청 거절, 단계 진행 조건, 개인정보 미전송.

## Phase 6 — 포트폴리오·운영
- **구현**: 학생 포트폴리오, 교사 대시보드/통계, 내보내기, 접근성 점검, 성능 최적화, 배포.
- **테스트**: 접근성(키보드/대비), 성능 예산, 회귀.
