import { defineEventHandler, getCookie } from "h3";
import {
  validateTokens,
  refreshAccessToken,
} from "~/utils/enfyra/server/refreshToken";
import { REFRESH_TOKEN_KEY } from "~/constants/enfyra";

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || "";

  const loginPath = "/api/login";
  const logoutPath = "/api/logout";
  const authPrefix = "/api/auth/";

  if (
    url === loginPath ||
    url === logoutPath ||
    url.startsWith(authPrefix)
  ) {
    return;
  }

  const { accessToken, needsRefresh } = validateTokens(event);

  let currentAccessToken: string | null = accessToken;

  if (needsRefresh) {
    const refreshToken = getCookie(event, REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        const config = useRuntimeConfig();
        const apiUrl = config.public?.enfyraSDK?.apiUrl;
        if (apiUrl) {
          currentAccessToken = await refreshAccessToken(
            event,
            refreshToken,
            apiUrl
          );
        }
      } catch (error) {
        currentAccessToken = null;
      }
    }
  }

  if (currentAccessToken) {
    event.context.proxyHeaders = event.context.proxyHeaders || {};
    event.context.proxyHeaders.authorization = `Bearer ${currentAccessToken}`;
  }
});
