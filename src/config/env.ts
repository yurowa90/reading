/**
 * 공개 환경 변수 접근을 한곳으로 모은다.
 * 여기에는 클라이언트 번들에 포함되어도 안전한 값만 둔다.
 * service role key 등 서버 전용 비밀값은 절대 이 파일에서 참조하지 않는다.
 *
 * 접근은 지연 평가(getter)한다. 그래야 환경 변수가 없어도 빌드/모듈 로드가
 * 실패하지 않고, 실제로 값이 필요한 요청 시점에만 검증 오류가 발생한다.
 */

function requirePublicEnv(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(
      `환경 변수 ${name} 가 설정되지 않았습니다. .env.local 을 확인하세요 (.env.example 참고).`,
    );
  }
  return value;
}

export const publicEnv = {
  get supabaseUrl(): string {
    return requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey(): string {
    return requirePublicEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  },
  get appUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },
};
