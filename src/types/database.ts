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

export type WorkKind = "review" | "poster";
export type WorkMode = "structured" | "free";
export type WorkStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "published"
  | "rejected"
  | "hidden";

/** 구조화 서평 7개 섹션. 모든 값은 선택적으로 저장하되 제출 시 필수 항목을 검증한다. */
export interface ReviewSections {
  one_line: string;
  key_problem: string;
  impressive_sentence: string;
  author_judgment: string;
  disagreement: string;
  connection: string;
  final_evaluation: string;
}

export interface Work {
  id: string;
  user_id: string;
  class_id: string;
  book_id: string;
  kind: WorkKind;
  mode: WorkMode | null;
  title: string | null;
  body: string | null;
  sections: ReviewSections | null;
  poster_path: string | null;
  poster_thumb_path: string | null;
  status: WorkStatus;
  review_note: string | null;
  reviewed_by: string | null;
  submitted_at: string | null;
  published_at: string | null;
  featured_at: string | null;
  featured_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherRubricScore {
  id: string;
  work_id: string;
  teacher_id: string;
  criteria: Record<string, number>;
  total: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface VotingRound {
  id: string;
  class_id: string;
  label: string | null;
  opens_at: string;
  closes_at: string;
  min_reviews_per_student: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  work_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  hidden_at: string | null;
  hidden_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Rating {
  work_id: string;
  user_id: string;
  score: number;
  created_at: string;
  updated_at: string;
}

export type ReportStatus = "open" | "resolved";

export interface Report {
  id: string;
  comment_id: string;
  reporter_id: string;
  reason: string | null;
  status: ReportStatus;
  created_at: string;
}

export type SocraticStage =
  | "OBSERVE"
  | "INTERPRET"
  | "EVIDENCE"
  | "COUNTERARGUMENT"
  | "CONNECT"
  | "ORGANIZE"
  | "COMPLETE";

export type ChatRole = "assistant" | "user";

export interface ChatSession {
  id: string;
  user_id: string;
  class_id: string;
  book_id: string;
  stage: SocraticStage;
  status: "active" | "completed";
  created_at: string;
  updated_at: string;
}

export interface SocraticResponse {
  stage: SocraticStage;
  question: string;
  hint?: string;
  nextStage: SocraticStage;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: ChatRole;
  stage: SocraticStage;
  content: string;
  structured: SocraticResponse | null;
  created_at: string;
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
