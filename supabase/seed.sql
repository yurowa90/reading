-- ============================================================================
-- seed.sql (예시 데이터)
--
-- 주의: auth.users 는 Supabase Auth 가 관리하므로, 여기서는 직접 만들지 않는다.
-- 아래 절차로 사용한다.
--   1) 앱 회원가입 화면 또는 Supabase 대시보드에서 계정 2개(교사용/학생용)를 만든다.
--   2) 교사 계정의 role 을 Supabase 대시보드 Table editor(profiles)에서 'teacher' 로 바꾼다.
--   3) 아래 :teacher_id / :student_id 에 각 계정의 auth uid 를 넣어 실행한다.
--        psql "$DATABASE_URL" \
--          -v teacher_id="'<교사 uid>'" -v student_id="'<학생 uid>'" \
--          -f supabase/seed.sql
--
-- join_code 는 트리거가 자동 생성하므로 생성 후 아래 select 로 확인한다.
-- ============================================================================

\if :{?teacher_id}
  insert into public.classes (name, teacher_id, description)
  values ('1학년 3반 독서', :teacher_id, '한 학기 한 권 읽기 시범 학급')
  returning id \gset seed_class_

  insert into public.books (class_id, title, author, publisher, created_by)
  values
    (:'seed_class_id', '데미안', '헤르만 헤세', '민음사', :teacher_id),
    (:'seed_class_id', '침묵의 봄', '레이첼 카슨', '에코리브르', :teacher_id);

  \echo '생성된 학급 참여 코드:'
  select name, join_code from public.classes where id = :'seed_class_id';
\else
  \echo 'teacher_id 변수가 없습니다. 위 주석의 절차대로 -v 옵션과 함께 실행하세요.'
\endif
