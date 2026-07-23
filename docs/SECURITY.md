# SECURITY.md — 보안 및 RLS 정책

권한은 **화면이 아니라 데이터베이스**에서 통제한다. 버튼 숨김은 UX일 뿐 보안이 아니다.

## 원칙

- 모든 public 테이블에 RLS 활성화. RLS 없는 public 테이블을 남기지 않는다.
- service role key는 브라우저 코드에서 절대 사용하지 않는다(Phase 1에서는 요구하지도 않음).
- 신규 사용자는 항상 `student`. 교사 권한은 관리자만 부여한다.
- 학생은 본인 자료만, 교사는 담당 학급만 접근한다.

## 역할 상승 차단 (핵심)

`profiles.role`을 사용자가 스스로 바꾸지 못하게 **두 겹**으로 막는다.

1. **회원가입 트리거** `handle_new_user()`가 role을 항상 `'student'`로 하드코딩.
   클라이언트가 넘기는 role 값을 신뢰하지 않는다.
2. **열 수준 GRANT**: `REVOKE UPDATE ON profiles FROM authenticated` 후
   `GRANT UPDATE (display_name, updated_at)`만 부여. authenticated는 role 열을 갱신할 수 없다.

교사 권한 부여는 Supabase 대시보드/서버 스크립트(service_role)로만 수행한다.

## SECURITY DEFINER 함수와 재귀 방지

RLS 정책이 같은 테이블을 다시 조회하면 무한 재귀가 발생한다. 이를 피하려고 권한 확인을
`SECURITY DEFINER` 함수로 감싼다(RLS를 우회하므로 재귀가 끊긴다). 모든 정의자 함수는
`SET search_path = ''` + 스키마 정규화로 search_path 공격을 차단한다.

- `current_user_role()` → 현재 사용자 역할
- `is_class_member(class_id)` → 활성 구성원 여부 (`auth.uid()` 사용)
- `is_class_teacher(class_id)` → 담당 교사 여부
- `shares_class_with(other)` → 같은 학급 공유 여부 (profiles 조회용)

모든 함수는 인자로 임의 `user_id`를 받지 않고 항상 `auth.uid()`를 사용한다 → 사칭 불가.

## 학급 참여 RPC

`join_class_with_code(p_code text)` (SECURITY DEFINER):
클라이언트가 `classes`를 직접 검색하지 않는다. RPC가 코드 검증과 가입을 처리한다.

- `auth.uid()`로 현재 사용자 확인(없으면 `unauthenticated`).
- 코드 정규화(대문자, 공백 제거) 후 조회. 없으면 `invalid`만 반환 —
  **학급 존재 여부나 교사 정보를 노출하지 않는다.**
- 이미 가입 시 `already_member`. 신규면 `class_members`에 `student`로 추가 후 `joined`.
- 참여 코드 원문을 로그에 남기지 않는다.
- `authenticated`에게만 EXECUTE 부여(`anon`/`public` REVOKE).

## RLS 정책 요약 — `supabase/migrations/0003_rls.sql`

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| profiles | 본인 또는 같은 학급 구성원 | 트리거만 | 본인(role 제외, 열 GRANT) | 없음(cascade) |
| classes | 담당 교사 또는 구성원 | 교사 + 본인이 teacher_id | 담당 교사 | 담당 교사 |
| class_members | 구성원 또는 담당 교사 | RPC/트리거만 | 담당 교사 | 담당 교사 |
| books | 구성원 또는 담당 교사 | 담당 교사 + created_by 본인 | 담당 교사 | 담당 교사 |
| sentence_cards | 본인 또는 담당 교사 | 본인 + 학급 구성원 | **본인만** | 본인 |

핵심 거부 규칙:
- 학생은 다른 학생의 문장 카드를 조회/수정할 수 없다.
- 교사는 담당 학급 문장 카드를 **조회만** 할 수 있고 수정할 수 없다.
- 다른 학급 교사는 이 학급 자료에 접근할 수 없다.
- 학생은 다른 사용자를 학급에 추가하거나 역할을 바꿀 수 없다(INSERT/역할 UPDATE 정책 없음).

## 파일 저장소 (Phase 2, 설계)

- 북포스터는 **private bucket** + Storage RLS. 공개 버킷 금지.
- 파일 경로에 학생 이름·학번·이메일을 포함하지 않는다(임의 파일명).
- 업로드 시 EXIF 위치정보 제거, 얼굴·실명 노출 경고.

## AI (Phase 5, 설계)

- 학생 이름·이메일·학번을 AI API로 보내지 않는다.
- AI API 키는 서버 환경 변수에만. adapter 구조로 제공자 교체 가능.
- 완성 서평 대필 요청 거절. 응답은 Zod로 구조 검증.

## 검증

RLS는 정상 접근뿐 아니라 **거부되어야 하는 접근**도 테스트한다.
시나리오는 `supabase/tests/rls_test.sql`, 자동화는 `docs/TEST_PLAN.md` 참고.
