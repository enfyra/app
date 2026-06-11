import { defineEventHandler, getCookie, getHeader } from "h3";
import {
  validateTokens,
  refreshAccessToken,
} from "~/utils/enfyra/server/refreshToken";
import { REFRESH_TOKEN_KEY } from "~/constants/enfyra";

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || "";
  const path = url.split("?")[0] || "";

  const loginPath = "/api/login";
  const logoutPath = "/api/logout";
  const oauthBridgePattern = /^\/api\/auth\/(?:google|facebook|github)(?:\/callback)?$/;

  if (
    path === loginPath ||
    path === logoutPath ||
    path === "/api/auth/set-cookies" ||
    oauthBridgePattern.test(path)
  ) {
    return;
  }

  const authHeader = getHeader(event, "authorization");
  if (authHeader?.startsWith("Bearer ")) {
    event.context.proxyHeaders = event.context.proxyHeaders || {};
    event.context.proxyHeaders.authorization = authHeader;
    return;
  }

  const { accessToken, needsRefresh } = validateTokens(event);

  let currentAccessToken: string | null = accessToken;

  if (needsRefresh) {
    const refreshToken = getCookie(event, REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        const config = useRuntimeConfig();
        const apiUrl = config.public?.apiUrl;
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
