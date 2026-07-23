"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CommentView } from "@/features/comments/queries";
import { COMMENT_TEMPLATE } from "@/lib/validation/engagement";
import {
  addCommentAction,
  editCommentAction,
  deleteCommentAction,
  reportCommentAction,
  setCommentHiddenAction,
} from "@/actions/comments";

interface Props {
  workId: string;
  comments: CommentView[];
  meId: string;
  isTeacher: boolean;
  canComment: boolean;
}

export function CommentThread({ workId, comments, meId, isTeacher, canComment }: Props) {
  const total = countComments(comments);
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-stone-600">댓글 {total}</h2>

      {canComment ? (
        <AddCommentForm workId={workId} />
      ) : (
        <p className="text-sm text-stone-400">게시된 작품에 학급 구성원이 댓글을 남길 수 있습니다.</p>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-stone-400">첫 댓글을 남겨 보세요.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id}>
              <CommentItem
                comment={c}
                workId={workId}
                meId={meId}
                isTeacher={isTeacher}
                canComment={canComment}
                isRoot
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function countComments(list: CommentView[]): number {
  return list.reduce((n, c) => n + 1 + countComments(c.replies), 0);
}

function AddCommentForm({
  workId,
  parentId,
  onDone,
}: {
  workId: string;
  parentId?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState(parentId ? "" : COMMENT_TEMPLATE);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const fd = new FormData();
    fd.set("workId", workId);
    if (parentId) fd.set("parentId", parentId);
    fd.set("body", body);
    startTransition(async () => {
      const result = await addCommentAction(null, fd);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setBody(parentId ? "" : COMMENT_TEMPLATE);
      onDone?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={parentId ? 2 : 3}
        maxLength={1000}
        placeholder="좋았던 점 / 궁금한 점 / 더 생각해 볼 점"
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "등록 중…" : parentId ? "답글 등록" : "댓글 등록"}
        </button>
        <span className="text-xs text-stone-400">{body.length}/1000</span>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function CommentItem({
  comment,
  workId,
  meId,
  isTeacher,
  canComment,
  isRoot,
}: {
  comment: CommentView;
  workId: string;
  meId: string;
  isTeacher: boolean;
  canComment: boolean;
  isRoot: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"view" | "edit" | "reply" | "report">("view");
  const [editBody, setEditBody] = useState(comment.body);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isAuthor = comment.user_id === meId;
  const hidden = comment.hidden_at !== null;

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.message ?? "처리에 실패했습니다.");
        return;
      }
      setMode("view");
      router.refresh();
    });
  }

  function saveEdit() {
    const fd = new FormData();
    fd.set("commentId", comment.id);
    fd.set("body", editBody);
    run(() => editCommentAction(null, fd));
  }

  function remove() {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    const fd = new FormData();
    fd.set("commentId", comment.id);
    fd.set("workId", workId);
    startTransition(async () => {
      await deleteCommentAction(fd);
      router.refresh();
    });
  }

  function report() {
    const fd = new FormData();
    fd.set("commentId", comment.id);
    fd.set("reason", reason);
    run(() => reportCommentAction(null, fd));
  }

  function toggleHidden() {
    const fd = new FormData();
    fd.set("commentId", comment.id);
    fd.set("workId", workId);
    fd.set("hide", hidden ? "false" : "true");
    run(() => setCommentHiddenAction(null, fd));
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-stone-700">{comment.authorName}</span>
        {hidden ? (
          <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-500">숨김 처리됨</span>
        ) : null}
      </div>

      {mode === "edit" ? (
        <div className="mt-1 space-y-1">
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={2}
            maxLength={1000}
            className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
          />
          <div className="flex gap-2">
            <button type="button" onClick={saveEdit} disabled={pending} className="text-sm text-brand underline">
              저장
            </button>
            <button type="button" onClick={() => setMode("view")} className="text-sm text-stone-500 underline">
              취소
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{comment.body}</p>
      )}

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-500">
        {isRoot && canComment ? (
          <button type="button" onClick={() => setMode(mode === "reply" ? "view" : "reply")}>
            답글
          </button>
        ) : null}
        {isAuthor && !hidden ? (
          <button type="button" onClick={() => setMode(mode === "edit" ? "view" : "edit")}>
            수정
          </button>
        ) : null}
        {isAuthor || isTeacher ? (
          <button type="button" onClick={remove} className="text-red-600">
            삭제
          </button>
        ) : null}
        {canComment && !isAuthor ? (
          <button type="button" onClick={() => setMode(mode === "report" ? "view" : "report")}>
            신고
          </button>
        ) : null}
        {isTeacher ? (
          <button type="button" onClick={toggleHidden} disabled={pending}>
            {hidden ? "숨김 해제" : "숨기기"}
          </button>
        ) : null}
      </div>

      {mode === "report" ? (
        <div className="mt-2 space-y-1 rounded border border-stone-200 bg-stone-50 p-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="신고 사유(선택)"
            maxLength={500}
            className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
          />
          <button type="button" onClick={report} disabled={pending} className="text-sm text-red-700 underline">
            신고 접수
          </button>
        </div>
      ) : null}

      {mode === "reply" ? (
        <div className="mt-2">
          <AddCommentForm workId={workId} parentId={comment.id} onDone={() => setMode("view")} />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}

      {comment.replies.length > 0 ? (
        <ul className="mt-3 space-y-2 border-l-2 border-stone-100 pl-3">
          {comment.replies.map((r) => (
            <li key={r.id}>
              <CommentItem
                comment={r}
                workId={workId}
                meId={meId}
                isTeacher={isTeacher}
                canComment={canComment}
                isRoot={false}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
