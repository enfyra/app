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

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const apiUrl = config.public.apiUrl;

  try {
    const body = await readBody(event);

    const response = await $fetch<any>(normalizeUrl(apiUrl, "/auth/login"), {
      method: "POST",
      body,
      headers: {
        cookie: getHeader(event, "cookie") || "",
      },
    });

    const { accessToken, refreshToken, expTime } = response;

    setAuthCookies(event, { accessToken, refreshToken, expTime });

    return response;
  } catch (err: any) {
    const statusCode = err?.response?.status || err?.statusCode || 401;
    const errorData = err?.response?._data || err?.data;

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
      pickMessage(errorData?.error?.message) ??
      pickMessage(errorData?.message) ??
      pickMessage(err?.statusMessage) ??
      pickMessage(err?.message);
    if (candidate) errorMessage = candidate;

    const code = errorData?.error?.code;
    if (typeof code === "string" && code.length > 0) errorCode = code;

    return sendError(
      event,
      createError({
        statusCode,
        statusMessage: errorMessage,
        data: {
          code: errorCode,
          details: errorData?.error?.details,
          correlationId: errorData?.error?.correlationId,
        },
      })
    );
  }
});
