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

## works RLS (Phase 2) — `0004_works.sql`

| 동작 | 규칙 |
| --- | --- |
| SELECT | 본인(모든 상태) 또는 담당 교사(모든 상태) 또는 같은 학급 구성원(`published`만) |
| INSERT | `user_id=auth.uid()` + 학급 구성원 + `status='draft'` 로만 시작 |
| UPDATE(작성자) | `draft`/`rejected`에서만 편집, 상태를 `draft`/`submitted`/`rejected`로만 변경(승인·게시·숨김 불가) |
| UPDATE(교사) | 담당 교사만 상태 전이(승인/반려/숨김). 내용 열은 서버 액션에서만 변경 |
| DELETE(작성자) | `draft`/`rejected`에서만 |

- 미승인 작품은 같은 학급 학생에게 보이지 않는다(게시 전 비공개).
- 학생은 스스로 자기 작품을 `published`로 만들 수 없다(RLS WITH CHECK로 상태값 제한).

## 파일 저장소 (Phase 2) — `0005_storage.sql`

- 북포스터는 **private bucket `posters`** + Storage RLS. 공개 버킷 금지.
- 경로 `{class_id}/{work_id}.webp` — 학생 이름·학번·이메일 미포함(uuid만).
- 클라이언트가 canvas 재인코딩으로 EXIF(위치정보) 제거 후 webp만 업로드. 얼굴·실명 노출 경고 표시.
- Storage SELECT 정책은 **works 가시성 규칙에 연결**된다(본인/담당 교사/게시된 작품을 보는 구성원).
  → 미승인 포스터 파일도 같은 학급 학생이 직접 URL로 열 수 없다.
- 조회는 서버가 생성하는 **단기 서명 URL**로만 노출한다.
- 버킷 크기 제한 10MB, mime `webp/jpeg/png`로 Storage가 서버측 강제.
- **미검증**: 로컬 Supabase 미구성으로 Storage 정책 런타임은 실행하지 못했다(절차만 문서화).

## 상호 피드백 RLS (Phase 3) — `0006_engagement.sql`

공정성 규칙을 DB에서 강제한다.

- **자기 작품 금지**: `can_rate_work`가 `w.user_id <> auth.uid()`를 요구 → 자기 작품 좋아요/별점 불가.
- **중복 금지**: `likes`/`ratings` 복합 PK로 한 작품당 1회. 별점만 UPDATE로 수정 가능.
- **평가 기간 한정**: `can_rate_work`가 `is_voting_open(class)`를 요구 → 평가 기간에만 좋아요/별점.
- **결과 비공개**: likes/ratings SELECT는 본인 행·담당 교사 외에는 `results_revealed`(기간 종료)일 때만
  허용 → 평가 기간 중 타인 집계를 볼 수 없다. 평균은 앱에서 최소 평가 수(3) 이상일 때만 표시.
- **댓글**: 게시작을 보는 구성원만 열람/작성. 숨김 댓글은 교사·작성자만. 작성자 수정/삭제, 교사 숨김·삭제.
  연속 등록은 5초 레이트리밋 트리거(SECURITY DEFINER)로 차단.
- **신고**: 볼 수 있는 댓글만 신고 가능(중복 신고는 unique로 차단). 조회·처리는 담당 교사(또는 신고자 본인 조회).

모든 보조 함수는 `SET search_path = ''` + 스키마 정규화. 교사 판정은 기존 `is_class_teacher`를 재사용해
재귀를 피한다.

## 우수작 후보·루브릭 (Phase 4) — `0007_rubric.sql`

- **teacher_rubric_scores**는 담당 교사만 CRUD(학생에게 루브릭 점수를 노출하지 않는다).
  `unique(work_id, teacher_id)`로 작품당 교사 1건.
- **works.featured_at**(최종 우수작)은 담당 교사만 설정(기존 works 교사 UPDATE 정책 사용).
- 후보 점수는 서버에서 계산해 **담당 교사에게만** 보인다(학생은 후보 목록/점수를 볼 수 없음).
- 화면 문구는 "우수작"이 아니라 "동료평가 기반 우수작 후보"로 표기하고, 자동 확정하지 않는다.

## AI (Phase 5, 설계)

- 학생 이름·이메일·학번을 AI API로 보내지 않는다.
- AI API 키는 서버 환경 변수에만. adapter 구조로 제공자 교체 가능.
- 완성 서평 대필 요청 거절. 응답은 Zod로 구조 검증.

## 검증

RLS는 정상 접근뿐 아니라 **거부되어야 하는 접근**도 테스트한다.
시나리오는 `supabase/tests/rls_test.sql`, 자동화는 `docs/TEST_PLAN.md` 참고.
