import {
  createError,
  defineEventHandler,
  getQuery,
  sendRedirect,
} from "h3";
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
    return sendRedirect(
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

  return sendRedirect(event, redirect, 302);
});
