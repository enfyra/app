import { defineEventHandler, getHeader, getCookie, deleteCookie } from "h3";
import { $fetch } from "ofetch";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  EXP_TIME_KEY,
} from "~/constants/enfyra";
import { normalizeUrl } from "~/utils/api/url";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const apiUrl = config.public.apiUrl;

  const refreshToken = getCookie(event, REFRESH_TOKEN_KEY);

  try {
    const result = await $fetch(normalizeUrl(apiUrl, "/auth/logout"), {
      method: "POST",
      headers: {
        cookie: getHeader(event, "cookie") || "",
        authorization: event.context.proxyHeaders?.authorization,
      },
      body: {
        refreshToken,
      },
    });

    deleteCookie(event, ACCESS_TOKEN_KEY);
    deleteCookie(event, REFRESH_TOKEN_KEY);
    deleteCookie(event, EXP_TIME_KEY);

    return result;
  } catch (err: any) {
    deleteCookie(event, ACCESS_TOKEN_KEY);
    deleteCookie(event, REFRESH_TOKEN_KEY);
    deleteCookie(event, EXP_TIME_KEY);

    return { success: false, message: "Logout completed locally" };
  }
});
