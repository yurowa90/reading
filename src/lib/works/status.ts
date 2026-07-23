import type { WorkStatus } from "@/types/database";

/** 상태별 한국어 라벨. 색상만으로 구분하지 않도록 항상 텍스트를 함께 쓴다. */
export const WORK_STATUS_LABEL: Record<WorkStatus, string> = {
  draft: "작성 중",
  submitted: "제출됨(검토 대기)",
  approved: "승인됨",
  published: "게시됨",
  rejected: "반려됨",
  hidden: "숨김",
};

export function statusLabel(status: WorkStatus): string {
  return WORK_STATUS_LABEL[status];
}

/** 작성자가 편집 가능한 상태인가. */
export function isEditableByOwner(status: WorkStatus): boolean {
  return status === "draft" || status === "rejected";
}
