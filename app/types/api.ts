export interface ApiError {
  message: string;
  status?: number;
  statusMessage?: string;
  url?: string;
  data?: any;
  response?: any;
}

export type ApiExecutionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError | null; aborted: boolean };
