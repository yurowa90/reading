"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/config/env";

/**
 * 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트.
 * anon key만 사용하며, 모든 접근은 RLS 정책으로 통제된다.
 */
export function createClient() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
