-- ============================================================================
-- prelude_stub.sql  —  로컬 Postgres에서 마이그레이션을 검증하기 위한 Supabase 스텁
--
-- 실제 Supabase에는 auth/storage 스키마와 authenticated/anon 역할, auth.uid() 등이
-- 기본 제공된다. 로컬 Postgres에는 없으므로, 마이그레이션 검증 전에 최소한만 흉내낸다.
-- 이 파일은 "검증 전용"이며 운영 DB에 적용하지 않는다.
-- 사용법은 validate_local.sh 참고.
-- ============================================================================

create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);
-- 세션 GUC(request.jwt.claim.sub)에서 현재 사용자 uid를 읽는다(테스트용).
create or replace function auth.uid() returns uuid
  language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id), name text, owner uuid
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[]
  language sql immutable as $$ select string_to_array(name, '/') $$;

grant usage on schema public, storage to authenticated, anon, service_role;
