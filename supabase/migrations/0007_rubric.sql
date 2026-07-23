-- ============================================================================
-- 0007_rubric.sql  (Phase 4)
-- 교사 루브릭 평가 + 최종 우수작 선정
--
-- 우수작 후보는 동료평가(좋아요/별점) 기반 점수로 "추천"만 한다(자동 확정 아님).
-- 교사가 루브릭으로 평가하고 최종 우수작을 확정한다.
-- ============================================================================

-- 최종 우수작 선정 표시(담당 교사만 설정). works 갱신은 기존 교사 정책이 허용.
alter table public.works
  add column if not exists featured_at timestamptz null,
  add column if not exists featured_by uuid null references public.profiles (id) on delete set null;

create index if not exists works_featured_idx on public.works (class_id, featured_at);

-- ----------------------------------------------------------------------------
-- 교사 루브릭 점수
-- criteria: jsonb (예: {"understanding":4,"evidence":5,"expression":3})
-- total: 합계(앱에서 계산해 저장)
-- ----------------------------------------------------------------------------
create table if not exists public.teacher_rubric_scores (
  id         uuid primary key default gen_random_uuid(),
  work_id    uuid not null references public.works (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  criteria   jsonb not null default '{}'::jsonb,
  total      int not null default 0 check (total >= 0 and total <= 100),
  comment    text null check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (work_id, teacher_id)
);
create index if not exists rubric_work_idx on public.teacher_rubric_scores (work_id);

drop trigger if exists set_updated_at on public.teacher_rubric_scores;
create trigger set_updated_at before update on public.teacher_rubric_scores
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS: 담당 교사만. (학생에게는 루브릭 점수를 노출하지 않는다)
-- ----------------------------------------------------------------------------
alter table public.teacher_rubric_scores enable row level security;

drop policy if exists rubric_select_teacher on public.teacher_rubric_scores;
create policy rubric_select_teacher on public.teacher_rubric_scores
  for select to authenticated
  using (public.is_work_class_teacher(work_id));

drop policy if exists rubric_insert_teacher on public.teacher_rubric_scores;
create policy rubric_insert_teacher on public.teacher_rubric_scores
  for insert to authenticated
  with check (public.is_work_class_teacher(work_id) and teacher_id = auth.uid());

drop policy if exists rubric_update_teacher on public.teacher_rubric_scores;
create policy rubric_update_teacher on public.teacher_rubric_scores
  for update to authenticated
  using (public.is_work_class_teacher(work_id) and teacher_id = auth.uid())
  with check (public.is_work_class_teacher(work_id) and teacher_id = auth.uid());

drop policy if exists rubric_delete_teacher on public.teacher_rubric_scores;
create policy rubric_delete_teacher on public.teacher_rubric_scores
  for delete to authenticated
  using (public.is_work_class_teacher(work_id) and teacher_id = auth.uid());
