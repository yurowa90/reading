-- ============================================================================
-- 0003_rls.sql
-- 모든 public 테이블에 RLS 활성화 + 정책 정의.
-- 원칙: 화면이 아니라 DB 정책으로 권한을 통제한다.
-- ============================================================================

alter table public.profiles       enable row level security;
alter table public.classes        enable row level security;
alter table public.class_members  enable row level security;
alter table public.books          enable row level security;
alter table public.sentence_cards enable row level security;

-- 역할 변경 방어: authenticated 는 profiles 의 특정 열만 UPDATE 가능(role 제외).
-- 교사 권한 부여는 Supabase 관리 화면/서버 스크립트(service_role)에서만 수행한다.
revoke update on public.profiles from authenticated;
grant update (display_name, updated_at) on public.profiles to authenticated;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_class_with(id));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
-- INSERT 는 handle_new_user 트리거(SECURITY DEFINER)만 수행. authenticated 정책 없음.
-- DELETE 는 auth.users 삭제 시 cascade. authenticated 정책 없음.

-- ----------------------------------------------------------------------------
-- classes
-- ----------------------------------------------------------------------------
drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes
  for select to authenticated
  using (teacher_id = auth.uid() or public.is_class_member(id));

drop policy if exists classes_insert_teacher on public.classes;
create policy classes_insert_teacher on public.classes
  for insert to authenticated
  with check (
    teacher_id = auth.uid()
    and public.current_user_role() in ('teacher', 'admin')
  );

drop policy if exists classes_update_owner on public.classes;
create policy classes_update_owner on public.classes
  for update to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists classes_delete_owner on public.classes;
create policy classes_delete_owner on public.classes
  for delete to authenticated
  using (teacher_id = auth.uid());

-- ----------------------------------------------------------------------------
-- class_members
-- INSERT 는 join_class_with_code RPC 와 add_teacher_as_member 트리거(둘 다
-- SECURITY DEFINER)만 수행한다. authenticated INSERT 정책을 두지 않아
-- 학생이 다른 사용자를 임의로 학급에 추가할 수 없다.
-- ----------------------------------------------------------------------------
drop policy if exists class_members_select on public.class_members;
create policy class_members_select on public.class_members
  for select to authenticated
  using (public.is_class_member(class_id) or public.is_class_teacher(class_id));

drop policy if exists class_members_update_teacher on public.class_members;
create policy class_members_update_teacher on public.class_members
  for update to authenticated
  using (public.is_class_teacher(class_id))
  with check (public.is_class_teacher(class_id));

drop policy if exists class_members_delete_teacher on public.class_members;
create policy class_members_delete_teacher on public.class_members
  for delete to authenticated
  using (public.is_class_teacher(class_id));

-- ----------------------------------------------------------------------------
-- books
-- ----------------------------------------------------------------------------
drop policy if exists books_select_member on public.books;
create policy books_select_member on public.books
  for select to authenticated
  using (public.is_class_member(class_id) or public.is_class_teacher(class_id));

drop policy if exists books_insert_teacher on public.books;
create policy books_insert_teacher on public.books
  for insert to authenticated
  with check (public.is_class_teacher(class_id) and created_by = auth.uid());

drop policy if exists books_update_teacher on public.books;
create policy books_update_teacher on public.books
  for update to authenticated
  using (public.is_class_teacher(class_id))
  with check (public.is_class_teacher(class_id));

drop policy if exists books_delete_teacher on public.books;
create policy books_delete_teacher on public.books
  for delete to authenticated
  using (public.is_class_teacher(class_id));

-- ----------------------------------------------------------------------------
-- sentence_cards
-- 학생: 본인 카드 CRUD. 교사: 담당 학급 카드 SELECT 만(수정 불가).
-- ----------------------------------------------------------------------------
drop policy if exists sentence_cards_select on public.sentence_cards;
create policy sentence_cards_select on public.sentence_cards
  for select to authenticated
  using (user_id = auth.uid() or public.is_class_teacher(class_id));

drop policy if exists sentence_cards_insert_own on public.sentence_cards;
create policy sentence_cards_insert_own on public.sentence_cards
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_class_member(class_id));

drop policy if exists sentence_cards_update_own on public.sentence_cards;
create policy sentence_cards_update_own on public.sentence_cards
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists sentence_cards_delete_own on public.sentence_cards;
create policy sentence_cards_delete_own on public.sentence_cards
  for delete to authenticated
  using (user_id = auth.uid());
