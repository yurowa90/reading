#!/usr/bin/env bash
# ============================================================================
# validate_local.sh — 로컬 Postgres에 마이그레이션을 적용하고 핵심 RLS를 검증한다.
#
# 목적: 실제 Supabase 없이도 마이그레이션(0001~0008)의 SQL 오류와 RLS 로직을
#       조기에 잡는다. Supabase 고유 객체(auth/storage/역할)는 prelude_stub.sql로 흉내낸다.
#
# 요구: PostgreSQL 14+ (initdb/pg_ctl/psql). 슈퍼유저로 실행하지 말 것(postgres는 root 거부).
# 실행: bash supabase/tests/validate_local.sh
#       (성공 시 모든 체크가 ✓ PASS 로 표시된다.)
# ============================================================================
set -euo pipefail

export PGOPTIONS='-c client_min_messages=warning'  # drop ... if exists 의 NOTICE 억제
HERE="$(cd "$(dirname "$0")" && pwd)"
MIG="$HERE/../migrations"
PGBIN="${PGBIN:-$(pg_config --bindir 2>/dev/null || echo /usr/lib/postgresql/16/bin)}"
WORK="$(mktemp -d)"
PORT="${PGPORT:-55432}"

cleanup() { "$PGBIN/pg_ctl" -D "$WORK/pgdata" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

"$PGBIN/initdb" -D "$WORK/pgdata" -A trust -U postgres >/dev/null
"$PGBIN/pg_ctl" -D "$WORK/pgdata" -l "$WORK/pg.log" \
  -o "-p $PORT -k $WORK -c listen_addresses=''" -w start >/dev/null
"$PGBIN/psql" -h "$WORK" -p "$PORT" -U postgres -c "create database t" >/dev/null

Q() { "$PGBIN/psql" -h "$WORK" -p "$PORT" -U postgres -d t -tA -q "$@"; }
RUN() { Q -v ON_ERROR_STOP=1 -f "$1"; }

echo "== 마이그레이션 적용 =="
RUN "$HERE/prelude_stub.sql"
for f in 0001_init 0002_functions 0003_rls 0004_works 0005_storage 0006_engagement 0007_rubric 0008_chat; do
  RUN "$MIG/$f.sql" >/dev/null && echo "  ✓ $f"
done

echo "== 기본 권한/사용자 =="
Q <<'SQL' >/dev/null
grant select,insert,update,delete on all tables in schema public to authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, updated_at) on public.profiles to authenticated;
insert into auth.users(id,email,raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','t','{"display_name":"교사"}'),
 ('22222222-2222-2222-2222-222222222222','a','{"display_name":"학생1"}'),
 ('33333333-3333-3333-3333-333333333333','b','{"display_name":"학생2"}');
update public.profiles set role='teacher' where id='11111111-1111-1111-1111-111111111111';
SQL

T=11111111-1111-1111-1111-111111111111; S1=22222222-2222-2222-2222-222222222222; S2=33333333-3333-3333-3333-333333333333
FAIL=0
chk(){ if [ "$2" = "$3" ]; then echo "  ✓ $1"; else echo "  ✗ $1 (got '$2' want '$3')"; FAIL=1; fi; }

Q -c "set role authenticated; set request.jwt.claim.sub='$T'; insert into public.classes(name,teacher_id) values('1반','$T');" >/dev/null
CID=$(Q -c "select id from public.classes limit 1;"); CODE=$(Q -c "select join_code from public.classes limit 1;")
Q -c "set role authenticated; set request.jwt.claim.sub='$S1'; select public.join_class_with_code('$CODE');" >/dev/null
Q -c "set role authenticated; set request.jwt.claim.sub='$S2'; select public.join_class_with_code('$CODE');" >/dev/null
Q -c "set role authenticated; set request.jwt.claim.sub='$T'; insert into public.books(class_id,title,created_by) values('$CID','책','$T');" >/dev/null
BID=$(Q -c "select id from public.books limit 1;")
Q -c "set role authenticated; set request.jwt.claim.sub='$S1'; insert into public.sentence_cards(user_id,class_id,book_id,quote,reason,interpretation) values('$S1','$CID','$BID','문','이','해');" >/dev/null

echo "== RLS 검증 =="
chk "참여코드 8자리" "${#CODE}" "8"
chk "교사 자동 구성원" "$(Q -c "select count(*) from public.class_members where user_id='$T';")" "1"
chk "S2가 S1 문장카드 못 봄" "$(Q -c "set role authenticated; set request.jwt.claim.sub='$S2'; select count(*) from public.sentence_cards;")" "0"
chk "교사는 학생 문장카드 봄"  "$(Q -c "set role authenticated; set request.jwt.claim.sub='$T'; select count(*) from public.sentence_cards;")" "1"
esc=$(Q -c "set role authenticated; set request.jwt.claim.sub='$S1'; update public.profiles set role='teacher' where id='$S1';" 2>&1 | grep -ci "denied" || true)
chk "학생 역할변경 차단" "$esc" "1"
# 학생은 draft 로만 생성 가능(submitted 로 직접 삽입 시 정책 거부)
chk "학생 자기게시(직접 submitted 삽입) 차단" "$(Q -c "set role authenticated; set request.jwt.claim.sub='$S1'; insert into public.works(user_id,class_id,book_id,kind,mode,status) values('$S1','$CID','$BID','review','free','submitted');" >/dev/null 2>&1 && echo bad || echo ok)" "ok"

# 실제 흐름: 학생 draft 생성 → submitted 로 변경 → 교사 published
Q -c "set role authenticated; set request.jwt.claim.sub='$S1'; insert into public.works(user_id,class_id,book_id,kind,mode,status) values('$S1','$CID','$BID','review','free','draft');" >/dev/null
WID=$(Q -c "select id from public.works limit 1;")
Q -c "set role authenticated; set request.jwt.claim.sub='$S1'; update public.works set status='submitted' where id='$WID';" >/dev/null
Q -c "set role authenticated; set request.jwt.claim.sub='$T'; update public.works set status='published' where id='$WID';" >/dev/null
Q -c "set role authenticated; set request.jwt.claim.sub='$T'; insert into public.voting_rounds(class_id,opens_at,closes_at) values('$CID',now()-interval '1h',now()+interval '1h');" >/dev/null
selflike=$(Q -c "set role authenticated; set request.jwt.claim.sub='$S1'; insert into public.likes(work_id,user_id) values('$WID','$S1');" 2>&1 | grep -ci "denied\|violates" || true)
chk "자기작품 좋아요 차단" "$selflike" "1"
Q -c "set role authenticated; set request.jwt.claim.sub='$S2'; insert into public.likes(work_id,user_id) values('$WID','$S2');" >/dev/null 2>&1
chk "평가기간중 소유자 집계 비공개" "$(Q -c "set role authenticated; set request.jwt.claim.sub='$S1'; select count(*) from public.likes where work_id='$WID';")" "0"
chk "교사 집계 열람" "$(Q -c "set role authenticated; set request.jwt.claim.sub='$T'; select count(*) from public.likes where work_id='$WID';")" "1"

echo ""
if [ "$FAIL" = "0" ]; then echo "== 전체 통과 (RLS 활성 테이블 $(Q -c "select count(*) from pg_tables t join pg_class c on c.relname=t.tablename where t.schemaname='public' and c.relrowsecurity;"), 정책 $(Q -c "select count(*) from pg_policies where schemaname in ('public','storage');")개) =="; else echo "== 실패 있음 =="; exit 1; fi
