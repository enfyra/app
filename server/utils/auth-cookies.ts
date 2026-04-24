import type { H3Event } from "h3";
import { setCookie } from "h3";
import {
  ACCESS_TOKEN_KEY,
  EXP_TIME_KEY,
  REFRESH_TOKEN_KEY,
} from "~/constants/enfyra";

type AuthCookiePayload = {
  accessToken: string;
  refreshToken: string;
  expTime: string | number;
};

export function setAuthCookies(
  event: H3Event,
  { accessToken, refreshToken, expTime }: AuthCookiePayload
) {
  const cookieOptions = {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: "lax" as const,
    path: "/",
  };

  setCookie(event, ACCESS_TOKEN_KEY, accessToken, cookieOptions);
  setCookie(event, REFRESH_TOKEN_KEY, refreshToken, cookieOptions);
  setCookie(event, EXP_TIME_KEY, String(expTime), cookieOptions);
}
