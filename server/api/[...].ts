import {
  createError,
  defineEventHandler,
  getQuery,
  getRequestURL,
  sendRedirect,
} from "h3";
import {
  requireValidCookieBridgePrefix,
  requireValidRedirectUrl,
} from "../utils/oauth";
import { proxyToAPI } from "~/utils/enfyra/server/proxy";

const OAUTH_PROVIDERS = ["google", "facebook", "github"];
const OAUTH_INIT_PATTERN = new RegExp(`/auth/(${OAUTH_PROVIDERS.join("|")})/?$`);
const OAUTH_CALLBACK_PATTERN = new RegExp(`/auth/(${OAUTH_PROVIDERS.join("|")})/callback$`);

export default defineEventHandler(async (event) => {
  if (event.method === "OPTIONS") {
    return "";
  }

  const config = useRuntimeConfig();
  const apiUrl = (config.public as any).apiUrl;
  const fullUrl = event.node?.req?.url || event.path || "";
  const [path, queryString] = fullUrl.split("?");

  const pathWithoutPrefix = (path || "").replace(/^\/api/, "") || "/";
  const oauthCallbackMatch = pathWithoutPrefix.match(OAUTH_CALLBACK_PATTERN);

  if (event.method === "GET" && oauthCallbackMatch) {
    if (!apiUrl) {
      throw createError({ statusCode: 500, message: "API URL not configured" });
    }
    const backendPath = pathWithoutPrefix.startsWith("/") ? pathWithoutPrefix : `/${pathWithoutPrefix}`;
    const backendUrl = `${apiUrl.replace(/\/+$/, "")}${backendPath}${queryString ? `?${queryString}` : ""}`;
    const response = await fetch(backendUrl, { redirect: "manual" });
    const location = response.headers.get("location") || response.headers.get("Location");
    if (location && response.status >= 300 && response.status < 400) {
      return sendRedirect(event, location, response.status as 301 | 302 | 307 | 308);
    }
    throw createError({ statusCode: 502, message: "OAuth callback failed" });
  }

  const oauthMatch = (path || "").match(OAUTH_INIT_PATTERN);
  if (event.method === "GET" && oauthMatch) {
    const provider = oauthMatch[1];
    const query = getQuery(event);

    let redirectParam: string;
    let cookieBridgePrefix: string | undefined;
    try {
      redirectParam = await requireValidRedirectUrl(query.redirect, event);
      cookieBridgePrefix = requireValidCookieBridgePrefix(query.cookieBridgePrefix);
    } catch (err: any) {
      const message = err?.statusMessage || err?.message || "OAuth validation failed";
      const loginUrl = new URL("/login", getRequestURL(event).origin);
      loginUrl.searchParams.set("error", message);
      if (typeof query.redirect === "string" && query.redirect.length > 0) {
        loginUrl.searchParams.set("redirect", query.redirect);
      }
      return sendRedirect(event, loginUrl.toString(), 302);
    }

    if (!apiUrl) {
      throw createError({ statusCode: 500, message: "API URL not configured" });
    }
    const backendUrl = new URL(
      `${apiUrl.replace(/\/+$/, "")}/auth/${provider}`
    );
    backendUrl.searchParams.set("redirect", redirectParam);
    if (cookieBridgePrefix) {
      backendUrl.searchParams.set("cookieBridgePrefix", cookieBridgePrefix);
    }
    const response = await fetch(backendUrl, { redirect: "manual" });
    const location = response.headers.get("location") || response.headers.get("Location");
    if (location && response.status >= 300 && response.status < 400) {
      return sendRedirect(event, location, 302);
    }
    throw createError({ statusCode: 502, message: "Failed to get OAuth URL from backend" });
  }

  return proxyToAPI(event);
});
