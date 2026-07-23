/**
 * Supabase 데이터베이스 타입 (Phase 1 범위).
 *
 * 이 파일은 supabase/migrations 의 스키마와 수동으로 동기화한다.
 * 실제 Supabase 프로젝트가 연결되면 `supabase gen types typescript`로
 * 자동 생성한 타입으로 교체할 수 있다(docs/DEPLOYMENT.md 참고).
 */

export type UserRole = "student" | "teacher" | "admin";

export type SentenceVisibility = "private" | "class";

export type ClassMemberStatus = "active" | "pending" | "removed";

export interface Profile {
  id: string;
  display_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface ClassRow {
  id: string;
  name: string;
  teacher_id: string;
  join_code: string;
  description: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassMember {
  class_id: string;
  user_id: string;
  member_role: UserRole;
  status: ClassMemberStatus;
  joined_at: string;
}

export interface Book {
  id: string;
  class_id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  isbn: string | null;
  cover_url: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SentenceCard {
  id: string;
  user_id: string;
  class_id: string;
  book_id: string;
  quote: string;
  page_reference: string | null;
  reason: string;
  interpretation: string;
  question: string | null;
  tags: string[];
  visibility: SentenceVisibility;
  created_at: string;
  updated_at: string;
}
