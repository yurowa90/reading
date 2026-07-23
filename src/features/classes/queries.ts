import { createClient } from "@/lib/supabase/server";
import type { ClassRow, Profile, UserRole } from "@/types/database";

export interface MyClass {
  class: ClassRow;
  memberRole: UserRole;
}

/** 현재 사용자가 속한 학급 목록 (RLS 로 본인 소속만 반환됨). */
export async function getMyClasses(): Promise<MyClass[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_members")
    .select("member_role, class:classes(*)")
    .eq("status", "active")
    .order("joined_at", { ascending: false });

  if (error || !data) return [];

  return data
    .filter((row): row is typeof row & { class: ClassRow } => row.class !== null)
    .map((row) => ({ class: row.class, memberRole: row.member_role }));
}

/** 단일 학급 조회 (비회원이면 RLS 로 null). */
export async function getClass(classId: string): Promise<ClassRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .maybeSingle<ClassRow>();
  return data ?? null;
}

export interface ClassMemberView {
  userId: string;
  memberRole: UserRole;
  displayName: string;
}

/** 학급 구성원 목록 (교사 화면용). */
export async function getClassMembers(classId: string): Promise<ClassMemberView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_members")
    .select("user_id, member_role, profile:profiles(display_name)")
    .eq("class_id", classId)
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    // 관계 조회 결과는 생성 타입이 없으면 배열로 추론되므로 unknown 경유로 좁힌다.
    const profile = row.profile as unknown as Pick<Profile, "display_name"> | null;
    return {
      userId: row.user_id,
      memberRole: row.member_role,
      displayName: profile?.display_name ?? "(이름 없음)",
    };
  });
}
