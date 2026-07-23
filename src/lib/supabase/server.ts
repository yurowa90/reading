import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/config/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * 서버 컴포넌트/서버 액션/Route Handler 용 Supabase 클라이언트.
 * 쿠키 기반 세션을 사용하며 anon key로 동작한다(RLS 통제).
 * service role key는 여기서 사용하지 않는다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // 서버 컴포넌트에서 set 이 호출되면 무시된다.
          // 세션 갱신은 미들웨어(updateSession)에서 처리한다.
        }
      },
    },
  });
}
