import {
  defineEventHandler,
  readBody,
  setCookie,
  createError,
  sendError,
  getHeader,
} from "h3";
import { $fetch } from "ofetch";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  EXP_TIME_KEY,
} from "~/constants/enfyra";
import { normalizeUrl } from "~/utils/api/url";

interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "none" | "lax" | "strict";
  path?: string;
  domain?: string;
  maxAge?: number;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const apiUrl = config.public.apiUrl;

  try {
    const body = await readBody(event);
    const { cookieOptions: userCookieOptions, ...loginBody } = body;

    const response = await $fetch<any>(normalizeUrl(apiUrl, "/auth/login"), {
      method: "POST",
      body: loginBody,
      headers: {
        cookie: getHeader(event, "cookie") || "",
      },
    });

    const { accessToken, refreshToken, expTime } = response;

    const defaultCookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    };

    const finalCookieOptions: CookieOptions = {
      ...defaultCookieOptions,
      ...userCookieOptions,
    };

    if (finalCookieOptions.sameSite === "none" && finalCookieOptions.secure === false) {
      console.warn("[Login] Invalid cookie options: secure must be true when sameSite=none. Forcing secure=true.");
      finalCookieOptions.secure = true;
    }

    setCookie(event, ACCESS_TOKEN_KEY, accessToken, finalCookieOptions);
    setCookie(event, REFRESH_TOKEN_KEY, refreshToken, finalCookieOptions);
    setCookie(event, EXP_TIME_KEY, String(expTime), finalCookieOptions);

    return response;
  } catch (err: any) {
    const statusCode = err?.response?.status || err?.statusCode || 401;
    const errorData = err?.response?._data || err?.data;

    let errorMessage = "Authentication failed";
    let errorCode = "AUTHENTICATION_ERROR";

    if (errorData?.error) {
      const msg = errorData.error.message || errorData.message;
      errorMessage = typeof msg === "string" ? msg : errorMessage;
      const code = errorData.error.code;
      errorCode = typeof code === "string" ? code : errorCode;
    }

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
