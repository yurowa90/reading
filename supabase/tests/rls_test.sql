-- ============================================================================
-- rls_test.sql  —  RLS 정책 거부/허용 검증 (수동 실행 SQL 테스트)
--
-- 목적: 로컬 Supabase(또는 임의 Postgres)에서 RLS 정책이 의도대로
--       "거부되어야 하는 접근"을 실제로 거부하는지 확인한다.
--
-- 실행: 로컬 Supabase 가 있으면
--         psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql \
--                              -f supabase/migrations/0002_functions.sql \
--                              -f supabase/migrations/0003_rls.sql \
--                              -f supabase/tests/rls_test.sql
--
-- 주의: 이 스크립트는 auth.uid() 를 흉내내기 위해 request.jwt.claims 를 설정하고
--       role 을 authenticated 로 바꿔가며 검증한다. 실제 auth.users 행이 필요하므로
--       로컬 환경에서 테스트 사용자 2명을 먼저 생성해야 한다.
--       CI 자동화 방법은 docs/TEST_PLAN.md 참고.
-- ============================================================================

-- 아래는 검증 시나리오 목록(각 항목은 실제 로컬 환경에서 실행/확인해야 함):
--   T1. 학생 A 는 학생 B 의 sentence_card 를 SELECT 할 수 없다.        (0건 반환)
--   T2. 학생 A 는 학생 B 의 sentence_card 를 UPDATE 할 수 없다.        (0건 갱신)
--   T3. 학생은 profiles.role 을 'teacher' 로 UPDATE 할 수 없다.        (권한 오류)
--   T4. 다른 학급 교사는 이 학급 books 를 SELECT 할 수 없다.          (0건 반환)
--   T5. 담당 교사는 담당 학급 학생 sentence_card 를 SELECT 할 수 있다.(N건 반환)
--   T6. 같은 join_code 로 두 번 가입해도 class_members 는 1행만 유지.  (unique)
--   T7. 잘못된 join_code 로 join_class_with_code 호출 시 'invalid' 반환.

-- 예시(T3) — 학생이 자기 역할을 교사로 바꾸려는 시도가 거부되는지:
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<학생 uid>","role":"authenticated"}';
--   update public.profiles set role = 'teacher' where id = '<학생 uid>';
--   -- 기대: ERROR: permission denied for column role  (또는 0 rows)

-- 예시(T7) — 잘못된 코드:
--   select public.join_class_with_code('ZZZZ9999');
--   -- 기대: {"status": "invalid"}

\echo 'rls_test.sql 은 시나리오 정의 문서입니다. 각 T1~T7 을 로컬 환경에서 실행/확인하세요.'
\echo '자동화 절차는 docs/TEST_PLAN.md 를 참고하세요.'
