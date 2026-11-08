export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export class AppError extends Error {
  constructor(
    public code: "UNAUTHENTICATED" | "INACTIVE" | "FORBIDDEN" | "VALIDATION" | "CONFLICT" | "NOT_FOUND",
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
