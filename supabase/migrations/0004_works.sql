-- ============================================================================
-- 0004_works.sql  (Phase 2)
-- 서평·북포스터(works) + 상태 워크플로 + RLS
--
-- 상태 워크플로:
--   draft ─(학생 제출)→ submitted ─(교사)→ published(게시)  or  rejected(반려)
--   rejected ─(학생 수정 후 재제출)→ submitted
--   published ─(교사)→ hidden(내림)
--   'approved' 값은 향후 "승인 후 별도 게시" 2단계 흐름을 위해 예약(현재 미사용).
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'work_kind') then
    create type public.work_kind as enum ('review', 'poster');
  end if;
  if not exists (select 1 from pg_type where typname = 'work_mode') then
    create type public.work_mode as enum ('structured', 'free');
  end if;
  if not exists (select 1 from pg_type where typname = 'work_status') then
    create type public.work_status as enum
      ('draft', 'submitted', 'approved', 'published', 'rejected', 'hidden');
  end if;
end
$$;

create table if not exists public.works (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  class_id          uuid not null references public.classes (id) on delete cascade,
  book_id           uuid not null references public.books (id) on delete cascade,
  kind              public.work_kind not null,
  -- 서평 전용: 작성 모드. 포스터는 null.
  mode              public.work_mode null,
  title             text null check (title is null or char_length(title) <= 200),
  -- 자유 모드 본문
  body              text null check (body is null or char_length(body) <= 20000),
  -- 구조화 모드 7개 섹션(jsonb). 키: one_line, key_problem, impressive_sentence,
  -- author_judgment, disagreement, connection, final_evaluation
  sections          jsonb null,
  -- 포스터 전용: private bucket 내 경로(개인정보 미포함)
  poster_path       text null check (poster_path is null or char_length(poster_path) <= 400),
  poster_thumb_path text null check (poster_thumb_path is null or char_length(poster_thumb_path) <= 400),
  status            public.work_status not null default 'draft',
  review_note       text null check (review_note is null or char_length(review_note) <= 1000),
  reviewed_by       uuid null references public.profiles (id) on delete set null,
  submitted_at      timestamptz null,
  published_at      timestamptz null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- kind 별 필수/불가 열 정합성
  constraint works_kind_mode_ck check (
    (kind = 'review' and mode is not null)
    or (kind = 'poster' and mode is null)
  )
);

create index if not exists works_class_status_idx on public.works (class_id, status);
create index if not exists works_user_idx on public.works (user_id);
create index if not exists works_book_idx on public.works (book_id);

drop trigger if exists set_updated_at on public.works;
create trigger set_updated_at before update on public.works
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.works enable row level security;

-- 조회: 본인(모든 상태) / 담당 교사(모든 상태) / 같은 학급 구성원(게시된 것만)
drop policy if exists works_select on public.works;
create policy works_select on public.works
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_class_teacher(class_id)
    or (public.is_class_member(class_id) and status = 'published')
  );

-- 생성: 본인 소유 + 학급 구성원 + draft 로만 시작
drop policy if exists works_insert_own on public.works;
create policy works_insert_own on public.works
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_class_member(class_id)
    and status = 'draft'
  );

-- 수정(작성자): draft/rejected 상태에서만 편집, 상태는 draft/submitted/rejected 로만.
-- (교사 승인/게시/숨김 상태로 스스로 올릴 수 없다)
drop policy if exists works_update_owner on public.works;
create policy works_update_owner on public.works
  for update to authenticated
  using (user_id = auth.uid() and status in ('draft', 'rejected'))
  with check (user_id = auth.uid() and status in ('draft', 'submitted', 'rejected'));

-- 수정(담당 교사): 상태 전이(승인/반려/숨김) 담당. 내용 열은 서버 액션에서만 변경.
drop policy if exists works_update_teacher on public.works;
create policy works_update_teacher on public.works
  for update to authenticated
  using (public.is_class_teacher(class_id))
  with check (public.is_class_teacher(class_id));

-- 삭제(작성자): draft/rejected 에서만
drop policy if exists works_delete_owner on public.works;
create policy works_delete_owner on public.works
  for delete to authenticated
  using (user_id = auth.uid() and status in ('draft', 'rejected'));
