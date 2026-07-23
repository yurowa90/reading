import { createClient } from "@/lib/supabase/server";

const BUCKET = "posters";
const SIGNED_URL_TTL = 60 * 10; // 10분

/**
 * private 버킷의 포스터 경로에 대한 서명 URL 을 생성한다(서버 전용).
 * Storage RLS 가 works 가시성 규칙을 강제하므로, 볼 수 없는 사용자에게는 실패한다.
 */
export async function getSignedPosterUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data) return null;
  return data.signedUrl;
}
