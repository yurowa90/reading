-- ============================================================================
-- 0005_storage.sql  (Phase 2)
-- 북포스터용 private Storage 버킷 + RLS 정책
--
-- 주의:
--  * 이 마이그레이션은 storage 스키마 소유 권한이 필요하다(Supabase SQL Editor 의
--    postgres 역할 또는 db push 로 실행). 로컬/클라우드에서 실행/검증한다.
--  * 버킷은 private. 조회는 서버가 생성한 서명 URL 로만 노출한다.
--  * 파일 경로는 `{class_id}/{work_id}.webp` 형식으로, 학생 이름/학번/이메일을 포함하지 않는다.
--  * 클라이언트가 canvas 재인코딩으로 EXIF(위치정보 포함)를 제거한 webp 만 업로드한다.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'posters',
  'posters',
  false,
  10485760, -- 10MB
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 첫 폴더명(class_id)을 안전하게 uuid 로 변환. 형식이 아니면 null 반환.
create or replace function public.storage_first_folder_uuid(object_name text)
returns uuid
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  v_first text := (storage.foldername(object_name))[1];
begin
  return v_first::uuid;
exception
  when others then
    return null;
end;
$$;

-- 업로드: 인증 사용자가 자신이 속한 학급 폴더에만 업로드
drop policy if exists posters_insert on storage.objects;
create policy posters_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'posters'
    and public.is_class_member(public.storage_first_folder_uuid(name))
  );

-- 조회: 해당 파일을 참조하는 works 의 가시성 규칙을 그대로 따른다
--   (본인 / 담당 교사 / 게시된 작품을 보는 같은 학급 구성원)
drop policy if exists posters_select on storage.objects;
create policy posters_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'posters'
    and exists (
      select 1 from public.works w
      where (w.poster_path = storage.objects.name or w.poster_thumb_path = storage.objects.name)
        and (
          w.user_id = auth.uid()
          or public.is_class_teacher(w.class_id)
          or (public.is_class_member(w.class_id) and w.status = 'published')
        )
    )
  );

-- 수정: 업로더 본인만(재업로드)
drop policy if exists posters_update on storage.objects;
create policy posters_update on storage.objects
  for update to authenticated
  using (bucket_id = 'posters' and owner = auth.uid())
  with check (bucket_id = 'posters' and owner = auth.uid());

-- 삭제: 업로더 본인 또는 담당 교사(부적절 이미지 내림)
drop policy if exists posters_delete on storage.objects;
create policy posters_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'posters'
    and (
      owner = auth.uid()
      or public.is_class_teacher(public.storage_first_folder_uuid(name))
    )
  );
