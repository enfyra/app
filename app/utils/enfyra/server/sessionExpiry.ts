export function isInvalidRefreshSessionError(error: unknown): boolean {
  const candidate = error as {
    statusCode?: unknown;
    status?: unknown;
    response?: { status?: unknown };
  };
  const status =
    candidate?.statusCode ?? candidate?.status ?? candidate?.response?.status;

  return status === 400 || status === 401 || status === 403;
}
