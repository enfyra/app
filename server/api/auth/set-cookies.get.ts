import {
  createError,
  defineEventHandler,
  getQuery,
  setHeader,
  setResponseStatus,
} from "h3";
import type { H3Event } from "h3";
import { buildUrlWithQuery, requireValidRedirectUrl } from "../../utils/oauth";
import { setAuthCookies } from "../../utils/auth-cookies";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const redirect = requireValidRedirectUrl(query.redirect);
  const error =
    typeof query.error === "string" && query.error.length > 0
      ? query.error
      : undefined;

  if (error) {
    return redirectToExternalUrl(
      event,
      buildUrlWithQuery(redirect, { error }),
      302
    );
  }

  const accessToken =
    typeof query.accessToken === "string" ? query.accessToken : "";
  const refreshToken =
    typeof query.refreshToken === "string" ? query.refreshToken : "";
  const expTime = typeof query.expTime === "string" ? query.expTime : "";

  if (!accessToken || !refreshToken || !expTime) {
    throw createError({
      statusCode: 400,
      statusMessage: "OAuth callback is missing token parameters",
    });
  }

  setAuthCookies(event, { accessToken, refreshToken, expTime });

  return redirectToExternalUrl(event, redirect, 302);
});

function redirectToExternalUrl(
  event: H3Event,
  location: string,
  statusCode: 301 | 302 | 307 | 308,
) {
  setResponseStatus(event, statusCode);
  setHeader(event, "Location", location);
  setHeader(event, "Content-Type", "text/html; charset=utf-8");
  return `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${escapeHtml(location)}"></head></html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
