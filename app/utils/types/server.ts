export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expTime: number;
}

export interface BackendErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path: string;
    method: string;
    correlationId?: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface StandardApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}