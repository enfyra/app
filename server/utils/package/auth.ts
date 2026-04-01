import { $fetch } from 'ofetch';
import { isAccessTokenExpired, decodeJWT } from '~/utils/enfyra/server/refreshToken';

export async function getValidAuthHeaders(
  cookieHeader: string,
  apiUrl: string,
): Promise<{ cookie: string; authorization: string }> {
  const headers = { cookie: cookieHeader, authorization: '' };

  const accessTokenMatch = cookieHeader.match(/(?:^|;\s*)enfyra_access_token=([^;]+)/);
  const refreshTokenMatch = cookieHeader.match(/(?:^|;\s*)enfyra_refresh_token=([^;]+)/);

  const accessToken = accessTokenMatch?.[1];
  const refreshToken = refreshTokenMatch?.[1];

  if (accessToken && !isAccessTokenExpired(accessToken)) {
    headers.authorization = `Bearer ${accessToken}`;
    return headers;
  }

  if (!refreshToken) return headers;

  try {
    const response = await $fetch(`${apiUrl}/auth/refresh-token`, {
      method: 'POST',
      body: { refreshToken },
    }) as any;

    if (response?.accessToken) {
      headers.authorization = `Bearer ${response.accessToken}`;
    }
  } catch {
    // token refresh failed, proceed without auth
  }

  return headers;
}
