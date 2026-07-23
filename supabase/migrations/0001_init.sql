-- ============================================================================
-- 0001_init.sql
-- Phase 1 스키마: enum, 테이블, 제약조건, 인덱스
-- 시간 열은 모두 timestamptz. 공통 열(id/created_at/updated_at)을 일관 적용.
-- ============================================================================

-- 사용자 역할 enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('student', 'teacher', 'admin');
  end if;
end
$$;

-- ----------------------------------------------------------------------------
-- profiles: auth.users 와 1:1. 개인정보는 최소한만 저장(전화/주소/학번 없음).
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text        not null check (char_length(display_name) between 1 and 20),
  role         public.user_role not null default 'student',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- classes: 학급. teacher_id 는 담당 교사. join_code 는 추측 어려운 임의 코드.
-- ----------------------------------------------------------------------------
create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null check (char_length(name) between 2 and 40),
  teacher_id  uuid        not null references public.profiles (id) on delete cascade,
  join_code   text        not null unique,
  description text        null check (description is null or char_length(description) <= 300),
  archived_at timestamptz null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists classes_teacher_id_idx on public.classes (teacher_id);

-- ----------------------------------------------------------------------------
-- class_members: 학급 구성원. (class_id, user_id) 복합 PK 로 중복 가입 차단.
-- ----------------------------------------------------------------------------
create table if not exists public.class_members (
  class_id    uuid        not null references public.classes (id) on delete cascade,
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  member_role public.user_role not null default 'student',
  status      text        not null default 'active'
                          check (status in ('active', 'pending', 'removed')),
  joined_at   timestamptz not null default now(),
  primary key (class_id, user_id)
);

create index if not exists class_members_user_id_idx on public.class_members (user_id);

-- ----------------------------------------------------------------------------
-- books: 학급별 도서.
-- ----------------------------------------------------------------------------
create table if not exists public.books (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid        not null references public.classes (id) on delete cascade,
  title       text        not null check (char_length(title) between 1 and 200),
  author      text        null check (author is null or char_length(author) <= 100),
  publisher   text        null check (publisher is null or char_length(publisher) <= 100),
  isbn        text        null check (isbn is null or char_length(isbn) <= 20),
  cover_url   text        null check (cover_url is null or char_length(cover_url) <= 500),
  description text        null check (description is null or char_length(description) <= 1000),
  created_by  uuid        not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists books_class_id_idx on public.books (class_id);

-- ----------------------------------------------------------------------------
-- sentence_cards: 문장 수집 카드. quote/reason/interpretation 필수.
-- page_reference 는 종이책 쪽수와 전자책 위치를 모두 담기 위해 text.
-- ----------------------------------------------------------------------------
create table if not exists public.sentence_cards (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles (id) on delete cascade,
  class_id       uuid        not null references public.classes (id) on delete cascade,
  book_id        uuid        not null references public.books (id) on delete cascade,
  quote          text        not null check (char_length(quote) between 1 and 1000),
  page_reference text        null check (page_reference is null or char_length(page_reference) <= 50),
  reason         text        not null check (char_length(reason) between 1 and 1000),
  interpretation text        not null check (char_length(interpretation) between 1 and 2000),
  question       text        null check (question is null or char_length(question) <= 500),
  tags           text[]      not null default '{}' check (array_length(tags, 1) is null or array_length(tags, 1) <= 8),
  visibility     text        not null default 'private' check (visibility in ('private', 'class')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists sentence_cards_user_id_idx on public.sentence_cards (user_id);
create index if not exists sentence_cards_class_book_idx on public.sentence_cards (class_id, book_id);
