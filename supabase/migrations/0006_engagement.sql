-- ============================================================================
-- 0006_engagement.sql  (Phase 3)
-- 댓글 · 답글 · 신고 · 좋아요 · 별점 · 상호평가 기간(voting_rounds)
--
-- 공정성 원칙:
--  * 자기 작품에는 좋아요/별점을 줄 수 없다(헬퍼 함수로 차단).
--  * 중복 좋아요/별점은 복합 PK로 차단.
--  * 평가 기간(open) 동안에는 타인의 좋아요/별점 집계를 볼 수 없다(RLS로 차단).
--  * 좋아요/별점은 "게시된(published)" 작품에만, "평가 기간이 열린" 동안만 가능.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 상호평가 기간
-- ----------------------------------------------------------------------------
create table if not exists public.voting_rounds (
  id                      uuid primary key default gen_random_uuid(),
  class_id                uuid not null references public.classes (id) on delete cascade,
  label                   text null check (label is null or char_length(label) <= 60),
  opens_at                timestamptz not null,
  closes_at               timestamptz not null,
  min_reviews_per_student int not null default 0 check (min_reviews_per_student >= 0),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint voting_rounds_period_ck check (closes_at > opens_at)
);
create index if not exists voting_rounds_class_idx on public.voting_rounds (class_id);

-- ----------------------------------------------------------------------------
-- 댓글 / 답글
-- ----------------------------------------------------------------------------
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  work_id    uuid not null references public.works (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  parent_id  uuid null references public.comments (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  hidden_at  timestamptz null,
  hidden_by  uuid null references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists comments_work_idx on public.comments (work_id, created_at);
create index if not exists comments_parent_idx on public.comments (parent_id);
create index if not exists comments_user_recent_idx on public.comments (user_id, created_at);

-- ----------------------------------------------------------------------------
-- 좋아요 (한 작품당 한 번)
-- ----------------------------------------------------------------------------
create table if not exists public.likes (
  work_id    uuid not null references public.works (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (work_id, user_id)
);
create index if not exists likes_work_idx on public.likes (work_id);

-- ----------------------------------------------------------------------------
-- 별점 (1~5, 한 작품당 한 번, 수정 가능)
-- ----------------------------------------------------------------------------
create table if not exists public.ratings (
  work_id    uuid not null references public.works (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  score      smallint not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (work_id, user_id)
);
create index if not exists ratings_work_idx on public.ratings (work_id);

-- ----------------------------------------------------------------------------
-- 신고 (부적절 댓글)
-- ----------------------------------------------------------------------------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  comment_id  uuid not null references public.comments (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason      text null check (reason is null or char_length(reason) <= 500),
  status      text not null default 'open' check (status in ('open', 'resolved')),
  created_at  timestamptz not null default now(),
  unique (comment_id, reporter_id)
);
create index if not exists reports_comment_idx on public.reports (comment_id);

-- updated_at 트리거
drop trigger if exists set_updated_at on public.voting_rounds;
create trigger set_updated_at before update on public.voting_rounds
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.comments;
create trigger set_updated_at before update on public.comments
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.ratings;
create trigger set_updated_at before update on public.ratings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 권한/공정성 보조 함수 (SECURITY DEFINER, search_path 고정)
-- ----------------------------------------------------------------------------

-- 작품의 학급 id
create or replace function public.work_class_id(p_work uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select class_id from public.works where id = p_work;
$$;

-- 작품의 담당 교사인가
create or replace function public.is_work_class_teacher(p_work uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_class_teacher(public.work_class_id(p_work));
$$;

-- 해당 학급에 지금 열린 평가 기간이 있는가
create or replace function public.is_voting_open(p_class uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.voting_rounds
    where class_id = p_class and now() >= opens_at and now() < closes_at
  );
$$;

-- 결과(집계)를 공개해도 되는가: 열린 평가 기간이 없으면 공개
create or replace function public.results_revealed(p_work uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select not public.is_voting_open(public.work_class_id(p_work));
$$;

-- 게시된 작품 + 같은 학급 구성원(댓글 열람/작성 기준)
create or replace function public.can_engage_published(p_work uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.works w
    where w.id = p_work and w.status = 'published'
      and public.is_class_member(w.class_id)
  );
$$;

-- 평가(좋아요/별점) 가능: 게시됨 + 구성원 + 자기 작품 아님 + 평가 기간 열림
create or replace function public.can_rate_work(p_work uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.works w
    where w.id = p_work and w.status = 'published'
      and w.user_id <> auth.uid()
      and public.is_class_member(w.class_id)
      and public.is_voting_open(w.class_id)
  );
$$;

-- 신고 가능: 댓글이 속한 게시 작품을 볼 수 있는 구성원
create or replace function public.can_report_comment(p_comment uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.comments c
    where c.id = p_comment and public.can_engage_published(c.work_id)
  );
$$;

-- 댓글이 속한 학급의 담당 교사인가
create or replace function public.is_comment_class_teacher(p_comment uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.comments c
    where c.id = p_comment and public.is_work_class_teacher(c.work_id)
  );
$$;

-- 연속 등록 제한(같은 사용자 5초 내 재작성 차단)
create or replace function public.enforce_comment_rate_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.comments
    where user_id = new.user_id and created_at > now() - interval '5 seconds'
  ) then
    raise exception 'comment_rate_limit' using message = '잠시 후 다시 시도하세요.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_rate_limit on public.comments;
create trigger enforce_rate_limit before insert on public.comments
  for each row execute function public.enforce_comment_rate_limit();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.voting_rounds enable row level security;
alter table public.comments      enable row level security;
alter table public.likes         enable row level security;
alter table public.ratings       enable row level security;
alter table public.reports       enable row level security;

-- voting_rounds: 구성원 조회, 담당 교사 관리
drop policy if exists voting_rounds_select on public.voting_rounds;
create policy voting_rounds_select on public.voting_rounds
  for select to authenticated
  using (public.is_class_member(class_id) or public.is_class_teacher(class_id));
drop policy if exists voting_rounds_write on public.voting_rounds;
create policy voting_rounds_write on public.voting_rounds
  for all to authenticated
  using (public.is_class_teacher(class_id))
  with check (public.is_class_teacher(class_id));

-- comments: 게시 작품을 보는 구성원 조회(숨김 댓글은 교사/작성자만)
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select to authenticated
  using (
    public.can_engage_published(work_id)
    and (hidden_at is null or user_id = auth.uid() or public.is_work_class_teacher(work_id))
  );
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_engage_published(work_id));
-- 작성자 본인 수정(내용). 상태(hidden)는 교사 정책에서.
drop policy if exists comments_update_author on public.comments;
create policy comments_update_author on public.comments
  for update to authenticated
  using (user_id = auth.uid() and hidden_at is null)
  with check (user_id = auth.uid());
drop policy if exists comments_update_teacher on public.comments;
create policy comments_update_teacher on public.comments
  for update to authenticated
  using (public.is_work_class_teacher(work_id))
  with check (public.is_work_class_teacher(work_id));
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments
  for delete to authenticated
  using (user_id = auth.uid() or public.is_work_class_teacher(work_id));

-- likes: 본인 행/교사는 항상, 타인 행은 결과 공개 시에만(평가 기간 중 집계 숨김)
drop policy if exists likes_select on public.likes;
create policy likes_select on public.likes
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_work_class_teacher(work_id)
    or (public.can_engage_published(work_id) and public.results_revealed(work_id))
  );
drop policy if exists likes_insert on public.likes;
create policy likes_insert on public.likes
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_rate_work(work_id));
drop policy if exists likes_delete on public.likes;
create policy likes_delete on public.likes
  for delete to authenticated
  using (user_id = auth.uid());

-- ratings: likes 와 동일한 가시성. 삽입 시 자기 작품 금지/평가 기간 검사.
drop policy if exists ratings_select on public.ratings;
create policy ratings_select on public.ratings
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_work_class_teacher(work_id)
    or (public.can_engage_published(work_id) and public.results_revealed(work_id))
  );
drop policy if exists ratings_insert on public.ratings;
create policy ratings_insert on public.ratings
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_rate_work(work_id));
drop policy if exists ratings_update on public.ratings;
create policy ratings_update on public.ratings
  for update to authenticated
  using (user_id = auth.uid() and public.can_rate_work(work_id))
  with check (user_id = auth.uid() and public.can_rate_work(work_id));
drop policy if exists ratings_delete on public.ratings;
create policy ratings_delete on public.ratings
  for delete to authenticated
  using (user_id = auth.uid());

-- reports: 신고자 본인 또는 담당 교사 조회. 삽입은 볼 수 있는 댓글에만. 처리는 교사.
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_comment_class_teacher(comment_id));
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and public.can_report_comment(comment_id));
drop policy if exists reports_update_teacher on public.reports;
create policy reports_update_teacher on public.reports
  for update to authenticated
  using (public.is_comment_class_teacher(comment_id))
  with check (public.is_comment_class_teacher(comment_id));
