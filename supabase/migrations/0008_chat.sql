-- ============================================================================
-- 0008_chat.sql  (Phase 5)
-- 독서 산파법 챗봇: 대화 세션 · 메시지
--
-- 원칙:
--  * AI는 서평을 대필하지 않는다. 한 번에 질문 하나만 기록한다.
--  * 학생 답변은 세션에 기록되며, 본인만 CRUD. 담당 교사는 열람(오남용 점검)만.
--  * 학생 식별정보(이름/이메일/학번)는 저장/전송하지 않는다.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'socratic_stage') then
    create type public.socratic_stage as enum (
      'OBSERVE', 'INTERPRET', 'EVIDENCE', 'COUNTERARGUMENT',
      'CONNECT', 'ORGANIZE', 'COMPLETE'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'chat_role') then
    create type public.chat_role as enum ('assistant', 'user');
  end if;
end
$$;

create table if not exists public.chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  class_id   uuid not null references public.classes (id) on delete cascade,
  book_id    uuid not null references public.books (id) on delete cascade,
  stage      public.socratic_stage not null default 'OBSERVE',
  status     text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chat_sessions_user_idx on public.chat_sessions (user_id, updated_at);

create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  role       public.chat_role not null,
  stage      public.socratic_stage not null,
  content    text not null check (char_length(content) between 1 and 4000),
  -- assistant 메시지의 구조화 응답(stage/question/hint/nextStage)
  structured jsonb null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_session_idx on public.chat_messages (session_id, created_at);

drop trigger if exists set_updated_at on public.chat_sessions;
create trigger set_updated_at before update on public.chat_sessions
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 보조 함수
-- ----------------------------------------------------------------------------
create or replace function public.is_my_chat_session(p_session uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.chat_sessions where id = p_session and user_id = auth.uid()
  );
$$;

create or replace function public.chat_session_class(p_session uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select class_id from public.chat_sessions where id = p_session;
$$;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- 세션: 본인 CRUD, 담당 교사 열람(점검용)
drop policy if exists chat_sessions_select on public.chat_sessions;
create policy chat_sessions_select on public.chat_sessions
  for select to authenticated
  using (user_id = auth.uid() or public.is_class_teacher(class_id));
drop policy if exists chat_sessions_insert on public.chat_sessions;
create policy chat_sessions_insert on public.chat_sessions
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_class_member(class_id));
drop policy if exists chat_sessions_update on public.chat_sessions;
create policy chat_sessions_update on public.chat_sessions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
drop policy if exists chat_sessions_delete on public.chat_sessions;
create policy chat_sessions_delete on public.chat_sessions
  for delete to authenticated
  using (user_id = auth.uid());

-- 메시지: 내 세션(본인) 조회/작성, 담당 교사 열람
drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages
  for select to authenticated
  using (
    public.is_my_chat_session(session_id)
    or public.is_class_teacher(public.chat_session_class(session_id))
  );
drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages
  for insert to authenticated
  with check (public.is_my_chat_session(session_id));
