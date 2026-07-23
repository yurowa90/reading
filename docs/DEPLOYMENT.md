# DEPLOYMENT.md — 배포 절차

대상: **Vercel**(앱) + **Supabase Cloud**(DB/Auth). service role key는 Phase 1에서 필요 없다.

## 1. Supabase 프로젝트 준비

1. supabase.com에서 프로젝트 생성. Project URL과 anon key 확보.
2. 마이그레이션 적용(순서 중요):
   - SQL Editor에 `0001_init` → `0002_functions` → `0003_rls` → `0004_works` → `0005_storage`
     순서로 실행, 또는 CLI: `supabase link --project-ref <ref>` 후 `supabase db push`.
   - `0005_storage.sql`는 private 버킷 `posters`와 Storage 정책을 만든다. storage 스키마 소유
     권한이 필요하므로 SQL Editor(postgres) 또는 `db push`로 실행하고, 이후 Storage → Buckets
     에서 `posters`(private) 생성을 확인한다. (이 환경에서는 런타임 검증을 하지 못했다.)
   - `0006_engagement.sql`(Phase 3): 댓글/좋아요/별점/상호평가 기간/신고 테이블과 RLS,
     공정성 헬퍼, 연속 등록 제한 트리거를 만든다.
   - `0007_rubric.sql`(Phase 4): 교사 루브릭 테이블(교사 전용 RLS)과 works 우수작 선정 컬럼을 만든다.
   - `0008_chat.sql`(Phase 5): 산파법 챗봇 세션/메시지 테이블과 RLS를 만든다.
3. Authentication → Email 활성화. 운영에서는 "Confirm email"을 켠다.
   - 켜면 회원가입 후 인증 메일 확인이 필요하다(앱이 안내 문구 표시).
   - Redirect URL에 배포 도메인(`https://<app>/dashboard`)을 추가한다.

## 2. 최초 교사 계정 부여 (수동)

일반 사용자는 스스로 교사가 될 수 없다. 최초 교사는 관리자가 직접 부여한다.

1. 대상 사용자가 앱에서 회원가입(학생으로 생성됨).
2. Supabase → Table editor → `profiles` → 해당 행 `role`을 `teacher`로 변경.
   또는 SQL Editor:
   ```sql
   update public.profiles set role = 'teacher' where id = '<auth uid>';
   ```
3. 이후 발급될 교사 승인 기능(Phase 6) 전까지는 이 방법만 사용한다.

## 3. Vercel 배포

1. 저장소를 Vercel에 연결. Framework: Next.js(자동 감지). 루트 디렉터리는 저장소 루트.
2. 환경 변수 등록(Production/Preview):
   ```
   NEXT_PUBLIC_APP_URL=https://<배포 도메인>
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
   > 이 세 값은 공개 가능(anon key는 RLS로 통제). service role key는 넣지 않는다.

   AI 챗봇(Phase 5)을 실제 Gemini로 쓰려면 **서버 전용** 변수를 추가한다(브라우저 노출 금지):
   ```
   AI_PROVIDER=gemini
   AI_API_KEY=<Google Gemini API 키>
   AI_MODEL=gemini-2.0-flash   # 선택
   ```
   Vercel에서는 이 값을 "Sensitive/Server" 환경 변수로 등록한다. 키가 없으면 mock으로 동작한다.
3. 배포 후 `NEXT_PUBLIC_APP_URL`과 Supabase Auth Redirect URL이 일치하는지 확인.

## 4. 배포 후 점검

- `/signup`으로 계정 생성 → `profiles`에 role=student 자동 생성 확인.
- 교사 계정으로 학급 생성 → 참여 코드 발급 확인.
- 학생 계정으로 참여 코드 입력 → 가입 확인.
- 학생이 문장 카드 작성/수정/삭제, 다른 학생 카드 접근 불가 확인.

## 5. 참고: 기존 정적 앱과의 공존

이 저장소에는 무관한 정적 앱(`index.html`)과 Jekyll 워크플로가 함께 있다.
Jekyll 워크플로(`.github/workflows/jekyll-docker.yml`)는 다른 브랜치에서만 트리거되어
이 앱 배포와 충돌하지 않는다. Vercel은 `index.html`을 무시하고 Next.js 앱을 빌드한다.
정리를 원하면 정적 앱과 워크플로를 별도 저장소로 분리하는 것을 권장한다(선택).

## 6. 환경 변수 원칙

- `.env*` 민감 파일은 커밋하지 않는다(`.gitignore` 처리됨). `.env.example`만 커밋.
- `NEXT_PUBLIC_` 접두사는 실제 공개 가능한 변수에만 사용한다.
- 추후 서버 전용 변수(`SUPABASE_SERVICE_ROLE_KEY`, `AI_API_KEY`)는 서버 환경에만 저장한다.
