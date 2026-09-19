export function sanitizeLoginResponse<T extends Record<string, unknown>>(
  response: T,
): Omit<T, "accessToken" | "refreshToken" | "expTime"> {
  const {
    accessToken: _accessToken,
    refreshToken: _refreshToken,
    expTime: _expTime,
    ...safeResponse
  } = response;
  return safeResponse;
}
