# DATA_MODEL.md — 데이터 모델

전체 구조를 설계하되, **Phase 1 테이블만 실제 마이그레이션으로 구현**한다.
Phase 2 이후 테이블은 여기 설계만 존재하며 코드/마이그레이션에 없다.

## 공통 규칙

- 공통 열: `id`(uuid), `created_at`, `updated_at`(모두 `timestamptz`).
- `updated_at`은 `set_updated_at()` 트리거가 갱신한다.
- 역할 enum `user_role`: `student` | `teacher` | `admin`. 신규 사용자 기본값 `student`.

## Phase 1 (구현됨) — `supabase/migrations/0001_init.sql`

### profiles
| 열 | 타입 | 비고 |
| --- | --- | --- |
| id | uuid PK | `auth.users.id` 참조, on delete cascade |
| display_name | text | 1–20자, 공개용 별칭 |
| role | user_role | 기본 `student`, 본인 변경 불가 |
| created_at / updated_at | timestamptz | |

전화·주소·학번 등 민감 정보는 저장하지 않는다.
회원가입 시 `handle_new_user()` 트리거가 자동 생성하며 role을 항상 `student`로 강제한다.

### classes
| 열 | 타입 | 비고 |
| --- | --- | --- |
| id | uuid PK | |
| name | text | 2–40자 |
| teacher_id | uuid | `profiles.id` 참조 |
| join_code | text UNIQUE | 트리거가 8자리(혼동 문자 제외) 자동 생성 |
| description | text NULL | ≤300자 |
| archived_at | timestamptz NULL | 보관 처리 |

`add_teacher_as_member()` 트리거가 생성 시 담당 교사를 구성원으로 추가한다.

### class_members
| 열 | 타입 | 비고 |
| --- | --- | --- |
| class_id | uuid | PK 일부 |
| user_id | uuid | PK 일부 |
| member_role | user_role | 기본 `student` |
| status | text | `active`/`pending`/`removed` |
| joined_at | timestamptz | |

복합 PK `(class_id, user_id)`로 중복 가입을 차단한다.

### books
`id, class_id, title(1–200), author?, publisher?, isbn?, cover_url?, description?, created_by, ts`.
학급별 도서. 담당 교사만 등록/수정/삭제, 구성원은 조회.

### sentence_cards
| 열 | 타입 | 비고 |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid | 작성자 |
| class_id | uuid | |
| book_id | uuid | |
| quote | text | **필수**, 1–1000자 |
| page_reference | text NULL | 종이책 쪽수·전자책 위치 모두 수용 |
| reason | text | **필수**, 선택 이유 |
| interpretation | text | **필수**, 자신의 해석 |
| question | text NULL | 떠오른 질문 |
| tags | text[] | 최대 8개 |
| visibility | text | 기본 `private` (`private`/`class`) |

## Phase 2 (구현됨) — `supabase/migrations/0004_works.sql`, `0005_storage.sql`

### works (서평 + 북포스터)
| 열 | 타입 | 비고 |
| --- | --- | --- |
| id | uuid PK | |
| user_id / class_id / book_id | uuid | 작성자·학급·도서 |
| kind | work_kind | `review` \| `poster` |
| mode | work_mode NULL | 서평만 `structured`/`free`, 포스터는 null |
| title | text NULL | |
| body | text NULL | 자유 모드 본문 |
| sections | jsonb NULL | 구조화 7섹션(one_line…final_evaluation) |
| poster_path / poster_thumb_path | text NULL | private bucket 경로(개인정보 미포함) |
| status | work_status | `draft`/`submitted`/`approved`/`published`/`rejected`/`hidden` |
| review_note | text NULL | 교사 반려 사유 |
| reviewed_by | uuid NULL | 검토 교사 |
| submitted_at / published_at | timestamptz NULL | |

- enum: `work_kind`, `work_mode`, `work_status`. `approved`는 향후 2단계 게시용 예약(현재 미사용).
- 상태 워크플로: draft→submitted→published/rejected, rejected→submitted 재제출, published→hidden.
- 제약: `kind='review'`면 mode 필수, `kind='poster'`면 mode null(`works_kind_mode_ck`).

### Storage: `posters` (private bucket)
- 경로 `{class_id}/{work_id}.webp`(+ `_thumb`). 학생 이름/학번/이메일 미포함.
- 클라이언트 canvas 재인코딩으로 EXIF(위치정보) 제거 + webp 변환 + 썸네일 생성.
- bucket 크기 제한 10MB, mime `webp/jpeg/png`. 조회는 서버 서명 URL로만.

## Phase 3 이후 (설계만, 미구현)

아래 테이블은 설계 참고용이다. 구현 시 반드시 RLS 정책과 거부 테스트를 동반한다.

- **comments**: `id, work_id, user_id, parent_id NULL, body, hidden_at, created_at`. 신고/교사 숨김 지원.
- **likes**: `work_id, user_id` 복합 PK(중복 방지). 자기 작품 좋아요 금지(트리거/정책).
- **ratings**: `work_id, user_id` 복합 PK. `score int check(1..5)`. 자기 작품 금지.
- **voting_rounds**: `id, class_id, opens_at, closes_at, min_reviews_per_student, m_prior int default 5, reveal_after_close bool`.
- **teacher_rubric_scores**: `id, work_id, teacher_id, criteria jsonb, total, comment`.
- **chat_sessions**: `id, user_id, book_id, stage, created_at`.
- **chat_messages**: `id, session_id, role('assistant'|'user'), stage, content, structured jsonb`.
- **reports**: `id, comment_id, reporter_id, reason, status, created_at`.
- **notifications**: `id, user_id, type, payload jsonb, read_at, created_at`.

### 우수작 후보 점수 (Phase 4, 계산식만 설계)

```
bayesian_rating = (v/(v+m))*R + (m/(v+m))*C     # R=작품 평균, v=평가수, C=전체 평균, m=신뢰수(기본 5)
normalized_like_score = log(1+likes) / log(1+max_likes)   # max_likes=0 이면 0
peer_candidate_score = 0.7*normalized_bayesian_rating + 0.3*normalized_like_score
```

최소 평가 수 충족 작품만 계산 → 상위 20%를 **"동료평가 기반 우수작 후보"**로 표시 →
교사 루브릭 평가 → 교사 최종 확정. "우수작"으로 자동 확정하지 않는다.

## ER 개요 (Phase 1)

```
auth.users 1─1 profiles 1─* classes(teacher) 
profiles *─* classes  (class_members)
classes 1─* books
profiles 1─* sentence_cards *─1 books
```
