-- ============================================================================
-- 0002_functions.sql
-- 트리거 함수, 권한 보조 함수(SECURITY DEFINER), 학급 참여 RPC
--
-- 보안 원칙:
--  * 모든 SECURITY DEFINER 함수는 search_path 를 명시적으로 ''(비움) 으로 고정하고
--    모든 객체를 스키마로 정규화한다.
--  * 권한 보조 함수는 항상 auth.uid() 만 사용한다. 임의 user_id 를 인자로 받지 않아
--    호출자가 다른 사용자를 사칭할 수 없다.
--  * 보조 함수는 SECURITY DEFINER 로 RLS 를 우회하므로 RLS 정책에서 사용해도
--    무한 재귀가 발생하지 않는다.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- updated_at 자동 갱신
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.classes;
create trigger set_updated_at before update on public.classes
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.books;
create trigger set_updated_at before update on public.books
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.sentence_cards;
create trigger set_updated_at before update on public.sentence_cards
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 회원가입 시 profile 자동 생성. role 은 항상 'student' 로 강제한다.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), '학생'), 20),
    'student'  -- 신규 사용자는 무조건 학생. 클라이언트 입력을 신뢰하지 않는다.
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 참여 코드 생성: 혼동 문자(0,O,1,I,L) 제외한 대문자+숫자 8자리.
-- classes INSERT 시 join_code 가 비어 있으면 유일한 코드를 생성한다.
-- ----------------------------------------------------------------------------
create or replace function public.generate_join_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
begin
  loop
    candidate := '';
    for i in 1..8 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.classes where join_code = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.set_class_join_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.join_code is null or char_length(trim(new.join_code)) = 0 then
    new.join_code := public.generate_join_code();
  end if;
  return new;
end;
$$;

drop trigger if exists set_join_code on public.classes;
create trigger set_join_code before insert on public.classes
  for each row execute function public.set_class_join_code();

-- ----------------------------------------------------------------------------
-- 학급 생성 시 담당 교사를 구성원(member_role='teacher')으로 자동 추가.
-- ----------------------------------------------------------------------------
create or replace function public.add_teacher_as_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.class_members (class_id, user_id, member_role, status)
  values (new.id, new.teacher_id, 'teacher', 'active')
  on conflict (class_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_class_created on public.classes;
create trigger on_class_created
  after insert on public.classes
  for each row execute function public.add_teacher_as_member();

-- ----------------------------------------------------------------------------
-- 권한 보조 함수 (RLS 정책에서 사용, 재귀 방지용 SECURITY DEFINER)
-- ----------------------------------------------------------------------------

-- 현재 로그인 사용자의 역할
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- 현재 사용자가 해당 학급의 활성 구성원인가
create or replace function public.is_class_member(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_members
    where class_id = p_class_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

-- 현재 사용자가 해당 학급의 담당 교사인가
create or replace function public.is_class_teacher(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.classes
    where id = p_class_id
      and teacher_id = auth.uid()
  );
$$;

-- 현재 사용자가 대상 사용자와 같은 학급(활성)을 공유하는가 (profiles 조회용)
create or replace function public.shares_class_with(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_members m_self
    join public.class_members m_other
      on m_self.class_id = m_other.class_id
    where m_self.user_id = auth.uid()
      and m_self.status = 'active'
      and m_other.user_id = p_other
      and m_other.status = 'active'
  );
$$;

-- ----------------------------------------------------------------------------
-- 학급 참여 RPC
-- 클라이언트가 classes 를 직접 검색하지 못하게 하고, 코드 검증/가입을 서버에서 처리.
-- 반환: json { status: 'joined' | 'already_member' | 'invalid', class_id, class_name }
-- 잘못된 코드에서는 학급 존재 여부/교사 정보를 노출하지 않는다.
-- ----------------------------------------------------------------------------
create or replace function public.join_class_with_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_class public.classes%rowtype;
  v_norm  text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
begin
  if v_uid is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  select * into v_class
  from public.classes
  where join_code = v_norm and archived_at is null;

  if not found then
    -- 학급 존재 여부를 드러내지 않기 위해 동일한 invalid 응답만 반환한다.
    return jsonb_build_object('status', 'invalid');
  end if;

  if exists (
    select 1 from public.class_members
    where class_id = v_class.id and user_id = v_uid and status = 'active'
  ) then
    return jsonb_build_object(
      'status', 'already_member',
      'class_id', v_class.id,
      'class_name', v_class.name
    );
  end if;

  insert into public.class_members (class_id, user_id, member_role, status)
  values (v_class.id, v_uid, 'student', 'active')
  on conflict (class_id, user_id)
  do update set status = 'active';

  return jsonb_build_object(
    'status', 'joined',
    'class_id', v_class.id,
    'class_name', v_class.name
  );
end;
$$;

-- RPC 는 로그인 사용자만 실행 가능
revoke all on function public.join_class_with_code(text) from public, anon;
grant execute on function public.join_class_with_code(text) to authenticated;
