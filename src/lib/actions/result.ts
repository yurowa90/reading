/**
 * 서버 액션의 표준 반환 타입.
 * 폼 컴포넌트는 이 결과로 성공/오류/필드 오류 상태를 렌더링한다.
 */
export type FieldErrors = Record<string, string[]>;

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionError(message: string, fieldErrors?: FieldErrors): ActionResult<never> {
  return { ok: false, message, fieldErrors };
}
