export type HttpMethod = "get" | "post" | "delete" | "patch";

export interface ApiOptions<T = any> {
  query?: Record<string, any>;
  body?: Record<string, any>;
  headers?: Record<string, string>;
  method?: HttpMethod;
  server?: boolean;
  default?: () => T | null;
  errorContext?: string;
  transform?: (data: any) => T;
  lazy?: boolean;
  immediate?: boolean;
}

export interface BackendError {
  message: string;
  statusCode: number;
  data?: any;
}

export interface ApiResponse<T = any> {
  data: T;
  meta?: {
    totalCount?: number;
    filterCount?: number;
    page?: number;
    limit?: number;
  };
}