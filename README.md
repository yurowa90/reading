# 책갈피 — 학급 독서교육 웹앱

고등학교 한 학급에서 책을 읽는 과정과 생각의 변화를 기록하는 독서교육 웹앱입니다.

## 누구를 위한 앱인가

- **학생**: 학급에 참여해 책을 고르고, 인상 깊은 문장을 모으고, 해석과 질문을 거쳐 서평과 북포스터를 만듭니다.
- **교사**: 학급을 만들고 학생 기록을 열람하며, 제출된 작품의 게시를 승인하고 우수작을 최종 선정합니다.

독서의 결과물보다 과정을 기록하는 데 초점을 둡니다. AI는 서평을 대신 써 주지 않고, 학생이 모은 문장을 서평의 근거로 연결하도록 돕습니다. 작품은 기본적으로 학급 안에서만 공개되고, 좋아요·별점은 우수작 후보를 추천하는 데에만 쓰이며 최종 판단은 교사가 합니다.

## 주요 기능

- **학급·도서**: 교사가 학급을 만들면 참여 코드가 생깁니다. 학생은 코드로 학급에 참여하고 읽을 책을 등록합니다.
- **문장 카드**: 책에서 고른 문장과 고른 이유, 해석을 카드로 남깁니다.
- **서평**: 7개 항목으로 나눈 구조화 모드와 자유 모드가 있습니다. 임시저장·미리보기, 모은 문장 끼워 넣기를 지원합니다.
- **북포스터**: 이미지를 올리면 브라우저에서 위치정보(EXIF)를 지우고 축소본을 만든 뒤 비공개 저장소에 보관합니다.
- **제출·게시 승인**: 작성 중 → 제출 → 게시 또는 반려 순서로 진행하며, 교사가 검토합니다. 게시한 작품을 숨길 수도 있습니다.
- **학급 갤러리**: 게시된 작품만 보입니다. 종류·도서·검색·무작위로 걸러 볼 수 있고, 이름 대신 별칭으로 표시됩니다.
- **상호 피드백**: 댓글·답글·신고, 좋아요, 별점(1~5). 교사는 댓글을 숨길 수 있습니다. 상호평가 기간 중에는 집계를 공개하지 않습니다. 자기 작품 평가와 중복 평가는 막혀 있습니다.
- **우수작 선정**: 동료평가 결과로 우수작 후보를 추천하고, 교사가 루브릭으로 평가해 최종 선정합니다.
- **독서 산파법 챗봇**: 7단계로 한 번에 질문 하나씩 던져 학생이 스스로 생각을 정리하게 합니다. 학생이 답해야 다음 단계로 넘어가며, 대신 써 달라는 요청은 받지 않습니다.
- **포트폴리오·대시보드(진행 중)**: 학생 독서 포트폴리오(문장·작품·대화 요약)와 브라우저 인쇄를 이용한 PDF 저장, 교사용 학급 참여 통계와 학생별 활동표가 있습니다.

## 두 가지 버전

| 버전 | 필요한 것 | 범위 |
| --- | --- | --- |
| 웹 버전(이 저장소의 본체) | Supabase 프로젝트, Node.js, 배포 환경(예: Vercel) | 위의 모든 기능 |
| Google Apps Script 간소화 버전(`apps-script/`) | 구글 계정만 | 학급 만들기·참여, 도서 등록, 문장 수집, 질문·토론 게시판, 교사의 학생 기록 열람. 자료는 구글 시트에 저장 |

간소화 버전을 만드는 방법은 [apps-script/README.md](apps-script/README.md)에 있습니다.

## 설치와 실행(웹 버전)

준비물: Node.js 20 이상, npm, Supabase 프로젝트 1개.

```bash
npm install
cp .env.example .env.local   # 아래 환경 변수 이름에 값을 채웁니다
npm run dev                  # http://localhost:3000
```

### 환경 변수

| 이름 | 용도 |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | 앱 주소(로컬이면 `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key(공개용 키, 접근은 DB 정책으로 통제) |
| `AI_PROVIDER` | 선택. `gemini` 또는 `mock` |
| `AI_API_KEY` | 선택. 본인의 Google Gemini API 키 |
| `AI_MODEL` | 선택. 기본값 `gemini-flash-latest` |

`AI_API_KEY`는 서버 환경 변수에만 둡니다. 이름 앞에 `NEXT_PUBLIC_`을 붙이면 브라우저에 노출되므로 붙이지 않습니다. 키가 없으면 챗봇은 미리 준비한 예시 질문(mock)으로 동작하고, 나머지 기능은 그대로 쓸 수 있습니다.

### Supabase 설정

1. Supabase 프로젝트의 URL과 anon key를 `.env.local`에 넣습니다.
2. `supabase/migrations/`의 SQL 파일을 번호 순서(0001~0008)대로 적용합니다. SQL Editor에 붙여 넣거나 Supabase CLI(`supabase link --project-ref <ref>` 후 `supabase db push`)를 씁니다.
3. 이메일 인증은 Authentication → Providers → Email에서 설정합니다. 시험 운영 중에는 "Confirm email"을 끄면 가입 즉시 로그인되고, 실제 운영에서는 켜 두기를 권합니다.
4. 처음 교사 계정을 만들려면 회원가입한 뒤 Table editor → `profiles`에서 그 사용자의 `role`을 `teacher`로 바꿉니다. 회원가입으로 만든 계정은 모두 학생이며, 사용자가 스스로 역할을 바꿀 수 없습니다.

배포 절차는 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)를 참고하세요.

## 개인정보와 AI

- 챗봇이 AI에 보내는 것은 책 제목·저자, 학생 답변, 수집한 문장뿐입니다. 학생 이름·이메일·학번은 보내지 않습니다.
- 북포스터는 공개되지 않는 저장 공간(`posters` 버킷)에 보관하며, 서버가 만든 서명 URL로만 볼 수 있습니다.
- 모든 데이터 접근은 화면이 아니라 데이터베이스 정책(RLS)으로 통제합니다. 학생은 자기 문장 카드만 고칠 수 있고, 교사는 담당 학급의 카드를 읽기만 합니다.
- 학급 참여는 참여 코드로만 할 수 있으며, 다른 학급 목록은 검색되지 않습니다.

## 알려진 한계

- 북포스터 저장 공간의 동작은 실제 Supabase 환경에서 아직 확인하지 않았습니다(정책 SQL 적용은 확인함).
- 알림, PDF 서버 렌더링(현재는 브라우저 인쇄로 대체), 접근성·성능 자동 점검은 아직 없습니다.
- Google Apps Script 간소화 버전은 권한 검사를 코드에서 하므로 웹 버전만큼 보안이 강하지 않습니다. 민감한 정보는 넣지 마세요.

## 개발 문서

- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — 기술 스택, 명령어, 검증 상태, 단계별 구현 범위
- [docs/PRD.md](docs/PRD.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/ROADMAP.md](docs/ROADMAP.md) · [docs/DATA_MODEL.md](docs/DATA_MODEL.md) · [docs/SECURITY.md](docs/SECURITY.md) · [docs/UX_FLOW.md](docs/UX_FLOW.md) · [docs/TEST_PLAN.md](docs/TEST_PLAN.md) · [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## 라이선스

시험 운영용 내부 프로젝트입니다.
