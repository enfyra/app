import type { MaybeRefOrGetter, Ref, UnwrapRef } from 'vue';

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

export type ApiBody = BodyInit | Record<string, unknown> | unknown[] | null;
export type ApiQuery = Record<string, unknown>;
export type ApiMethod = 'get' | 'head' | 'patch' | 'post' | 'put' | 'delete' | 'connect' | 'options' | 'trace' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE';
export type ApiQuerySource = MaybeRefOrGetter<ApiQuery | undefined | Promise<ApiQuery | undefined>>;

export interface ApiRequestOptions {
  body?: ApiBody;
  query?: ApiQuery;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiSingleExecuteOptions extends ApiRequestOptions {
  id?: string | number;
  ids?: never;
  files?: never;
}

export type ApiBatchExecuteOptions = ApiRequestOptions & {
  batchSize?: number;
  concurrent?: number;
  id?: never;
} & (
  | { ids: (string | number)[]; files?: never; headersByIndex?: never }
  | { files: FormData[]; ids?: never; headersByIndex?: Record<number, Record<string, string>> }
);

interface ApiCommonOptions {
  body?: MaybeRefOrGetter<ApiBody | undefined>;
  query?: ApiQuerySource;
  headers?: Record<string, string>;
  errorContext?: string;
  onError?: (error: ApiError, context?: string) => boolean | void;
  disableErrorPage?: boolean;
  cancelPrevious?: boolean;
  immediate?: boolean;
}

export interface ApiOptions extends ApiCommonOptions {
  method?: ApiMethod;
  batch?: false;
  disableBatch?: boolean;
}

export interface ApiBatchOptions extends ApiCommonOptions {
  method: 'post' | 'POST' | 'patch' | 'PATCH' | 'delete' | 'DELETE';
  batch: true;
  disableBatch?: never;
}

export interface ApiTransportContext {
  path: string;
  method: ApiMethod;
  query: ApiQuery | undefined;
  headers: Record<string, string>;
  signal: AbortSignal;
  prepareBody: (path: string) => Promise<ApiBody | undefined>;
  onAttempt: (path: string) => void;
}

export interface ApiComposable<T, Options = ApiSingleExecuteOptions> {
  data: Ref<UnwrapRef<T> | null, UnwrapRef<T> | T | null>;
  error: Ref<ApiError | null>;
  pending: Ref<boolean>;
  status: Ref<'idle' | 'pending' | 'success' | 'error'>;
  execute: (options?: Options) => Promise<T | null>;
  executeWithResult: (options?: Options) => Promise<ApiExecutionResult<T>>;
  refresh: () => Promise<T | null>;
  cancel: () => void;
}

export interface ApiBatchComposable<T> extends Omit<ApiComposable<T[], ApiBatchExecuteOptions>, 'execute' | 'executeWithResult' | 'refresh'> {
  execute: (options: ApiBatchExecuteOptions) => Promise<T[] | null>;
  executeWithResult: (options: ApiBatchExecuteOptions) => Promise<ApiExecutionResult<T[]>>;
}
