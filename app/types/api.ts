export interface ApiError {
  message: string;
  status?: number;
  statusMessage?: string;
  url?: string;
  data?: unknown;
  response?: unknown;
}

export type ApiExecutionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError | null; aborted: boolean };
