import {
  createError,
  defineEventHandler,
  getQuery,
  sendRedirect,
  setResponseHeaders,
} from "h3";
import { proxyToAPI } from "~/utils/enfyra/server/proxy";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const OAUTH_PROVIDERS = ["google", "facebook", "github"];
const OAUTH_INIT_PATTERN = new RegExp(`/auth/(${OAUTH_PROVIDERS.join("|")})/?$`);
const OAUTH_CALLBACK_PATTERN = new RegExp(`/auth/(${OAUTH_PROVIDERS.join("|")})/callback$`);

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, CORS_HEADERS);

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
    const redirectParam = query.redirect as string;
    if (!redirectParam) {
      throw createError({ statusCode: 400, message: "Redirect URL is required" });
    }
    if (!apiUrl) {
      throw createError({ statusCode: 500, message: "API URL not configured" });
    }
    const backendUrl = `${apiUrl.replace(/\/+$/, "")}/auth/${provider}?redirect=${encodeURIComponent(redirectParam)}`;
    const response = await fetch(backendUrl, { redirect: "manual" });
    const location = response.headers.get("location") || response.headers.get("Location");
    if (location && response.status >= 300 && response.status < 400) {
      console.log("[Enfyra OAuth] Redirecting to:", location);
      return sendRedirect(event, location, 302);
    }
    throw createError({ statusCode: 502, message: "Failed to get OAuth URL from backend" });
  }

  return proxyToAPI(event);
});
