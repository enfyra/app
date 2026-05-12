import { getCookie, type H3Event } from "h3";
import { $fetch } from "ofetch";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "~/constants/enfyra";
import { normalizeUrl } from "~/utils/api/url";
import { setAuthCookies } from "~/utils/enfyra/server/authCookies";

interface TokenValidationResult {
  accessToken: string | null;
  needsRefresh: boolean;
}

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expTime: number;
}

const REFRESH_REUSE_WINDOW_MS = 2000;
const refreshRequests = new Map<string, Promise<RefreshTokenResponse>>();
const refreshResults = new Map<
  string,
  { expiresAt: number; response: RefreshTokenResponse }
>();

export function decodeJWT(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1] || "";
    const decodedPayload = Buffer.from(payload, "base64url").toString("utf-8");
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.warn("Failed to decode JWT:", error);
    return null;
  }
}

export function isAccessTokenExpired(accessToken: string): boolean {
  const decoded = decodeJWT(accessToken);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const expirationTime = decoded.exp * 1000;
  return Date.now() >= expirationTime;
}

export function validateTokens(event: H3Event): TokenValidationResult {
  const accessToken = getCookie(event, ACCESS_TOKEN_KEY);
  const refreshToken = getCookie(event, REFRESH_TOKEN_KEY);

  if (accessToken && !isAccessTokenExpired(accessToken)) {
    return { accessToken, needsRefresh: false };
  } else if (refreshToken && (!accessToken || isAccessTokenExpired(accessToken))) {
    return { accessToken: null, needsRefresh: true };
  }

  return { accessToken: null, needsRefresh: false };
}

export async function refreshAccessToken(
  event: H3Event,
  refreshToken: string,
  apiUrl: string
): Promise<string> {
  try {
    const cached = refreshResults.get(refreshToken);
    if (cached && cached.expiresAt > Date.now()) {
      setRefreshedAuthCookies(event, cached.response);
      return cached.response.accessToken;
    }

    if (cached) {
      refreshResults.delete(refreshToken);
    }

    let refreshRequest = refreshRequests.get(refreshToken);
    if (!refreshRequest) {
      refreshRequest = $fetch<RefreshTokenResponse>(
        normalizeUrl(apiUrl, "/auth/refresh-token"),
        {
          method: "POST",
          body: { refreshToken },
        }
      );
      refreshRequests.set(refreshToken, refreshRequest);
      refreshRequest
        .then((response) => {
          refreshResults.set(refreshToken, {
            expiresAt: Date.now() + REFRESH_REUSE_WINDOW_MS,
            response,
          });
          setTimeout(() => {
            const cached = refreshResults.get(refreshToken);
            if (cached && cached.response === response) {
              refreshResults.delete(refreshToken);
            }
          }, REFRESH_REUSE_WINDOW_MS);
        })
        .catch(() => {
          refreshResults.delete(refreshToken);
        })
        .finally(() => {
          refreshRequests.delete(refreshToken);
        });
    }

    const response = await refreshRequest;

    setRefreshedAuthCookies(event, response);

    return response.accessToken;
  } catch (error) {
    console.warn("Token refresh failed:", error);
    throw error;
  }
}

function setRefreshedAuthCookies(
  event: H3Event,
  response: RefreshTokenResponse
) {
  setAuthCookies(event, response);
}
