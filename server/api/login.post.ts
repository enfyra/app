import { buildForwardedHeaders } from "~/utils/enfyra/server/forwardedHeaders";
import {
  defineEventHandler,
  readBody,
  createError,
  sendError,
  getHeader,
} from "h3";
import { $fetch } from "ofetch";
import { normalizeUrl } from "~/utils/api/url";
import { setAuthCookies } from "../utils/auth-cookies";
import { sanitizeLoginResponse } from "../utils/auth-response";
import { requireValidPostLoginRedirectUrl } from "../utils/oauth";
import type { BackendLoginResponse } from "../types/api";
import { getApiErrorRecord } from "~/utils/api/error";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const apiUrl = config.public.apiUrl;

  try {
    const body = await readBody<Record<string, unknown>>(event);
    const { redirect: redirectValue, ...credentials } = body;
    const redirect = await requireValidPostLoginRedirectUrl(
      redirectValue,
      event,
    );

    const response = await $fetch<BackendLoginResponse>(normalizeUrl(apiUrl, "/auth/login"), {
      method: "POST",
      body: credentials,
      headers: {
        ...buildForwardedHeaders(event.node.req),
        cookie: getHeader(event, "cookie") || "",
      },
    });

    const { accessToken, refreshToken, expTime } = response;

    setAuthCookies(event, { accessToken, refreshToken, expTime });

    return {
      ...sanitizeLoginResponse(response),
      ...(redirect ? { redirect } : {}),
    };
  } catch (err: unknown) {
    const failure = getApiErrorRecord(err);
    const response = getApiErrorRecord(failure?.response);
    const status = response?.status || failure?.statusCode || 401;
    const statusCode = typeof status === "number" ? status : 401;
    const errorData = getApiErrorRecord(response?._data || failure?.data);
    const backendError = getApiErrorRecord(errorData?.error);

    let errorMessage = "Authentication failed";
    let errorCode = "AUTHENTICATION_ERROR";

    const pickMessage = (value: unknown): string | null => {
      if (typeof value === "string" && value.length > 0) return value;
      if (Array.isArray(value) && value.length > 0) {
        return value.map((v) => String(v)).join("; ");
      }
      return null;
    };

    const candidate =
      pickMessage(backendError?.message) ??
      pickMessage(errorData?.message) ??
      pickMessage(failure?.statusMessage) ??
      pickMessage(failure?.message);
    if (candidate) errorMessage = candidate;

    const code = backendError?.code;
    if (typeof code === "string" && code.length > 0) errorCode = code;

    return sendError(
      event,
      createError({
        statusCode,
        statusMessage: errorMessage,
        data: {
          code: errorCode,
          details: backendError?.details,
          correlationId: backendError?.correlationId,
        },
      })
    );
  }
});
