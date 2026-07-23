# UX_FLOW.md — 화면 흐름

모든 화면은 한국어, 모바일 우선. 학생은 스마트폰, 교사는 데스크톱 사용성도 확보.
로딩·빈 화면·성공·오류 상태를 모두 구현하고, 색상만으로 상태를 구분하지 않는다.

## 라우트 (Phase 1)

| 경로 | 그룹 | 설명 |
| --- | --- | --- |
| `/` | (public) | 서비스 소개 + 로그인/회원가입 이동 |
| `/login` | (auth) | 로그인 |
| `/signup` | (auth) | 회원가입(항상 학생) |
| `/onboarding` | — | 프로필 미생성 예외 안내 |
| `/dashboard` | (app) | 역할별 대시보드 |
| `/classes/new` | (app) | 학급 생성(교사) |
| `/classes/join` | (app) | 참여 코드 입력 |
| `/classes/[classId]` | (app) | 학급 상세(교사: 참여코드·구성원) |
| `/classes/[classId]/books` | (app) | 도서 목록 |
| `/classes/[classId]/books/new` | (app) | 도서 등록(교사) |
| `/classes/[classId]/sentences` | (app) | 문장 목록(학생: 내 것 / 교사: 학생 것) |
| `/classes/[classId]/sentences/new` | (app) | 문장 작성 |
| `/sentences/[sentenceId]/edit` | (app) | 문장 수정·삭제(본인) |
| `/classes/[classId]/works` | (app) | 내 작품(서평·포스터) 목록·제출·삭제 |
| `/classes/[classId]/works/reviews/new` | (app) | 서평 작성(구조화/자유) |
| `/classes/[classId]/works/posters/new` | (app) | 북포스터 업로드 |
| `/works/[workId]` | (app) | 작품 상세(본인/교사/게시 열람) |
| `/works/[workId]/edit` | (app) | 서평 수정(본인, draft/rejected) |
| `/classes/[classId]/pending` | (app) | 교사 검토 큐(승인/반려/숨김) |
| `/classes/[classId]/gallery` | (app) | 학급 갤러리(게시작, 필터·검색·무작위) |
| `/profile` | (app) | 프로필(별칭 수정) |

## 학생 흐름

```
회원가입 → 로그인 → 대시보드 → 학급 참여(코드) → 학급 상세
   → 도서 확인 → 문장 수집(작성) → 목록/필터 → 수정 → 삭제
```

## 교사 흐름

```
로그인(교사 계정) → 대시보드 → 학급 만들기 → 참여 코드 공유
   → 도서 등록 → 학급 상세에서 구성원/학생 문장 기록 확인
   → 검토 큐에서 제출작 게시 승인/반려/숨김 → 갤러리 확인
```

## 작품 흐름 (Phase 2)

```
학생: 서평 쓰기(임시저장·미리보기·수집문장 삽입) 또는 포스터 업로드
   → 제출 → (교사 승인) → 학급 갤러리 게시 / (반려) → 사유 확인 후 수정·재제출
교사: 검토 큐 → 게시 승인 → 갤러리 노출 / 필요 시 숨김
```

포스터 이미지는 private bucket에 저장되고, 조회는 서버 서명 URL로만 이뤄진다.
업로드 시 EXIF(위치정보)는 클라이언트에서 제거되며, 얼굴·실명 노출 경고를 표시한다.

## 상태 처리 규칙

- **로딩**: 폼 제출 중 버튼 비활성 + "…중" 라벨(`useTransition`).
- **빈 화면**: `EmptyState`로 안내 문구 + 다음 행동 유도.
- **성공/오류**: `Alert`(`role="alert"`). 접두어("완료:"/"오류:")로 색맹 대응.
- **폼 오류**: 각 필드 하단(`Field`)에 근접 표시.

## 문장 카드 표시 예시

```
“수집한 문장”
책 제목 · 저자 · 73쪽
선택한 이유 / 나의 해석 / 떠오른 질문
#책임 #선택 #공동체
```

## 접근성

- 모든 입력에 `<label htmlFor>` 연결, 필수 표시.
- 키보드 포커스 가시성(globals.css `:focus-visible`).
- 필터 활성 항목에 `aria-current="page"`.
- 이미지 대체텍스트, 색상 외 텍스트 라벨 병행.

## 공개 범위·별칭

- 학생 작품은 기본 학급 내부 공개(문장 카드는 기본 `private`).
- 실명 대신 공개 별칭(`display_name`)을 우선 표시한다.
