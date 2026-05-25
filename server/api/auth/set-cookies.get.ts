import {
  createError,
  defineEventHandler,
  getQuery,
  sendRedirect,
} from "h3";
import { buildUrlWithQuery, requireValidRedirectUrl } from "../../utils/oauth";
import { setAuthCookies } from "../../utils/auth-cookies";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const query = getQuery(event);
  const redirect = requireValidRedirectUrl(query.redirect);
  const error =
    typeof query.error === "string" && query.error.length > 0
      ? query.error
      : undefined;

  if (error) {
    return sendRedirect(
      event,
      buildUrlWithQuery(redirect, { error }),
      302
    );
  }

  const code = typeof query.code === "string" ? query.code : "";

  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: "OAuth callback is missing exchange code",
    });
  }

  const apiUrl = (config.public as any).apiUrl;
  if (!apiUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "API URL not configured",
    });
  }

  const tokens = await $fetch<{
    accessToken: string;
    refreshToken: string;
    expTime: number | string;
  }>("/auth/oauth/exchange", {
    baseURL: apiUrl,
    method: "POST",
    body: { code },
  });

  const accessToken = tokens.accessToken;
  const refreshToken = tokens.refreshToken;
  const expTime = String(tokens.expTime);

  if (!accessToken || !refreshToken || !expTime) {
    throw createError({
      statusCode: 502,
      statusMessage: "OAuth exchange did not return tokens",
    });
  }

  setAuthCookies(event, { accessToken, refreshToken, expTime });

  return sendRedirect(event, redirect, 302);
});
