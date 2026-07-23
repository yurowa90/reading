import { createClient } from "@/lib/supabase/server";
import type { Comment } from "@/types/database";

export interface CommentView extends Comment {
  authorName: string;
  replies: CommentView[];
}

/** 작품의 댓글을 트리(최상위 + 답글 1단계)로 반환. */
export async function getComments(workId: string): Promise<CommentView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select("*, author:profiles(display_name)")
    .eq("work_id", workId)
    .order("created_at", { ascending: true });

  const rows =
    (data as (Comment & { author: { display_name: string } | null })[] | null) ?? [];

  const map = new Map<string, CommentView>();
  const roots: CommentView[] = [];

  for (const row of rows) {
    const { author, ...rest } = row;
    map.set(row.id, { ...rest, authorName: author?.display_name ?? "익명", replies: [] });
  }
  for (const row of rows) {
    const node = map.get(row.id)!;
    if (row.parent_id && map.has(row.parent_id)) {
      map.get(row.parent_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export interface OpenReportView {
  reportId: string;
  reason: string | null;
  commentId: string;
  commentBody: string;
  commentHidden: boolean;
  workId: string;
  reporterName: string;
}

/** 교사 신고 큐: 담당 학급의 미처리(open) 신고. */
export async function getOpenReports(classId: string): Promise<OpenReportView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(
      "id, reason, status, comment:comments(id, body, hidden_at, work_id, work:works(class_id)), reporter:profiles(display_name)",
    )
    .eq("status", "open")
    .order("created_at", { ascending: true });

  type Row = {
    id: string;
    reason: string | null;
    comment: {
      id: string;
      body: string;
      hidden_at: string | null;
      work_id: string;
      work: { class_id: string } | null;
    } | null;
    reporter: { display_name: string } | null;
  };

  const rows = (data as Row[] | null) ?? [];
  return rows
    .filter((r) => r.comment?.work?.class_id === classId)
    .map((r) => ({
      reportId: r.id,
      reason: r.reason,
      commentId: r.comment!.id,
      commentBody: r.comment!.body,
      commentHidden: r.comment!.hidden_at !== null,
      workId: r.comment!.work_id,
      reporterName: r.reporter?.display_name ?? "익명",
    }));
}
