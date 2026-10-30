import {
  createError,
  defineEventHandler,
  getQuery,
  sendRedirect,
} from "h3";
import {
  requireValidCookieBridgePrefix,
  requireValidOAuthState,
  requireValidRedirectUrl,
} from "../utils/oauth";
import { createOAuthBrowserBinding } from "../utils/oauth-browser-state";
import { proxyToAPI } from "~/utils/enfyra/server/proxy";
import { buildForwardedHeaders } from "~/utils/enfyra/server/forwardedHeaders";
import finalizeOAuthCookies from './auth/set-cookies.get';
import { getApiErrorRecord } from '~/utils/api/error';

const OAUTH_PROVIDERS = ["google", "facebook", "github"];
const OAUTH_INIT_PATTERN = new RegExp(`^/auth/(${OAUTH_PROVIDERS.join("|")})/?$`, 'i');
const OAUTH_CALLBACK_PATTERN = new RegExp(`^/auth/(${OAUTH_PROVIDERS.join("|")})/callback/?$`, 'i');

/**
 * Route ownership must be decided on the same normalized path the proxy
 * forwards. Comparing the raw request URL lets percent-encoding and separator
 * variants reach the backend while skipping the bridge-owned finalizer.
 */
function resolveBridgePath(rawUrl: string): string {
  const path = rawUrl.split("?")[0] || "/";
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    decoded = path;
  }
  return decoded.replace(/\\/g, "/").replace(/^\/api(?=\/|$)/i, "") || "/";
}

export default defineEventHandler(async (event) => {
  if (event.method === "OPTIONS") {
    return "";
  }

  const config = useRuntimeConfig();
  const apiUrl = config.public.apiUrl;
  const fullUrl = event.node?.req?.url || event.path || "";
  const [, queryString] = fullUrl.split("?");

  const pathWithoutPrefix = resolveBridgePath(fullUrl);
  if (/^\/auth\/set-cookies\/?$/i.test(pathWithoutPrefix)) {
    if (event.method !== 'GET') throw createError({ statusCode: 405, message: 'Method not allowed' });
    return finalizeOAuthCookies(event);
  }
  const oauthCallbackMatch = pathWithoutPrefix.match(OAUTH_CALLBACK_PATTERN);

  if (event.method === "GET" && oauthCallbackMatch) {
    if (!apiUrl) {
      throw createError({ statusCode: 500, message: "API URL not configured" });
    }
    const backendPath = `/auth/${oauthCallbackMatch[1]!.toLowerCase()}/callback`;
    const backendUrl = `${apiUrl.replace(/\/+$/, "")}${backendPath}${queryString ? `?${queryString}` : ""}`;
    const response = await fetch(backendUrl, { redirect: "manual", headers: buildForwardedHeaders(event.node.req) });
    const location = response.headers.get("location") || response.headers.get("Location");
    if (location && response.status >= 300 && response.status < 400) {
      return sendRedirect(event, location, response.status as 301 | 302 | 307 | 308);
    }
    throw createError({ statusCode: 502, message: "OAuth callback failed" });
  }

  const oauthMatch = pathWithoutPrefix.match(OAUTH_INIT_PATTERN);
  if (event.method === "GET" && oauthMatch) {
    const provider = oauthMatch[1]!.toLowerCase();
    const query = getQuery(event);

    let redirectParam: string;
    let cookieBridgePrefix: string | undefined;
    let state: string | undefined;
    try {
      redirectParam = createOAuthBrowserBinding(
        event,
        await requireValidRedirectUrl(query.redirect, event),
      );
      cookieBridgePrefix = requireValidCookieBridgePrefix(query.cookieBridgePrefix);
      state = requireValidOAuthState(query.state);
    } catch (err: unknown) {
      const failure = getApiErrorRecord(err);
      const message = failure?.statusMessage || failure?.message || "OAuth validation failed";
      const loginQuery = new URLSearchParams({ error: String(message) });
      if (typeof query.redirect === "string" && query.redirect.length > 0) {
        loginQuery.set("redirect", query.redirect);
      }
      return sendRedirect(event, `/login?${loginQuery}`, 302);
    }

    if (!apiUrl) {
      throw createError({ statusCode: 500, message: "API URL not configured" });
    }
    const backendUrl = new URL(
      `${apiUrl.replace(/\/+$/, "")}/auth/${provider}`
    );
    backendUrl.searchParams.set("redirect", redirectParam);
    if (state !== undefined) {
      backendUrl.searchParams.set("state", state);
    }
    if (cookieBridgePrefix) {
      backendUrl.searchParams.set("cookieBridgePrefix", cookieBridgePrefix);
    }
    const response = await fetch(backendUrl, { redirect: "manual", headers: buildForwardedHeaders(event.node.req) });
    const location = response.headers.get("location") || response.headers.get("Location");
    if (location && response.status >= 300 && response.status < 400) {
      return sendRedirect(event, location, 302);
    }
    throw createError({ statusCode: 502, message: "Failed to get OAuth URL from backend" });
  }

  return proxyToAPI(event);
});
