# TEST_PLAN.md — 테스트 계획

## 단위 테스트 (Vitest) — 구현됨

`tests/unit/` — `npm run test`로 실행. 현재 3파일 23케이스 통과.

- `validation.test.ts`: signUp/login/class/book/sentence Zod 스키마, 참여 코드 형식.
- `tags.test.ts`: 태그 정규화(분리·중복·길이·개수 제한).
- `roles.test.ts`: 역할 판정 유틸(`isTeacher`/`isStudent`), 기본 역할.

## 데이터베이스(RLS) 테스트 — 시나리오 정의됨

`supabase/tests/rls_test.sql`에 거부/허용 시나리오를 정의했다. 로컬 Supabase가 있어야
자동 실행할 수 있어, 이번 릴리스에서는 **실행하지 못했다**(환경 미구성). 검증 항목:

- T1 학생이 다른 학생 문장 카드 SELECT 불가
- T2 학생이 다른 학생 문장 카드 UPDATE 불가
- T3 학생이 `profiles.role`을 teacher로 변경 불가
- T4 다른 학급 교사가 이 학급 books SELECT 불가
- T5 담당 교사가 담당 학급 문장 카드 SELECT 가능
- T6 참여 코드 중복 가입 방지(복합 PK)
- T7 잘못된 참여 코드 → `invalid` (정보 미노출)

### 로컬 실행 방법

```bash
# Supabase CLI 필요
supabase start                     # 로컬 스택 기동
export DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
psql "$DATABASE_URL" \
  -f supabase/migrations/0001_init.sql \
  -f supabase/migrations/0002_functions.sql \
  -f supabase/migrations/0003_rls.sql
# 테스트 사용자 2명 생성(대시보드/Admin API) 후 rls_test.sql의 각 T 절차 수행
psql "$DATABASE_URL" -f supabase/tests/rls_test.sql
```

RLS를 세션 사용자로 검증할 때는 `set local role authenticated;` 와
`set local request.jwt.claims = '{"sub":"<uid>","role":"authenticated"}';` 로
`auth.uid()`를 흉내낸 뒤 각 쿼리의 반환 행 수/오류를 확인한다.

## E2E 테스트 (Playwright) — 스켈레톤

`tests/e2e/phase1.spec.ts`. 환경 변수(`NEXT_PUBLIC_SUPABASE_*`)가 없으면 자동 `skip`.

핵심 흐름:
```
회원가입 → 로그인 → 학급 참여 → 도서 확인 → 문장 작성 → 수정 → 삭제
교사 로그인 → 학급 생성 → 도서 등록 → 학생 문장 목록 확인
```

### 준비 (fixture)

1. 로컬 Supabase 기동 + 마이그레이션 적용.
2. 이메일 인증 끄기(로컬), 또는 Admin API로 확인된 사용자 생성.
3. 교사 fixture 계정의 `role`을 teacher로 설정.
4. `.env.local`에 로컬 Supabase 값 설정 후 `npm run test:e2e`.

Chromium은 환경에 사전 설치되어 있으므로 `playwright install`을 실행하지 않는다.

## 실행 상태 (이번 릴리스)

| 항목 | 상태 |
| --- | --- |
| lint | 통과 |
| typecheck | 통과 |
| unit test | 통과(23) |
| build | 통과 |
| DB(RLS) test | 실행하지 못함(로컬 Supabase 미구성) — 시나리오 문서화 |
| e2e | 실행하지 못함(로컬 Supabase 미구성) — 스켈레톤/skip |
