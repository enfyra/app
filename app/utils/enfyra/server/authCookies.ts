import { setCookie, type H3Event } from "h3";
import {
  ACCESS_TOKEN_KEY,
  EXP_TIME_KEY,
  REFRESH_TOKEN_KEY,
} from "~/constants/enfyra";

export type AuthCookiePayload = {
  accessToken: string;
  refreshToken: string;
  expTime: string | number;
};

type AuthCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge?: number;
  expires?: Date;
};

export function setAuthCookies(
  event: H3Event,
  { accessToken, refreshToken, expTime }: AuthCookiePayload
) {
  const accessMaxAge = getEpochMsCookieMaxAge(expTime) ?? getJwtCookieMaxAge(accessToken);
  const refreshMaxAge = getJwtCookieMaxAge(refreshToken);

  setCookie(
    event,
    ACCESS_TOKEN_KEY,
    accessToken,
    createCookieOptions(accessMaxAge)
  );
  setCookie(
    event,
    REFRESH_TOKEN_KEY,
    refreshToken,
    createCookieOptions(refreshMaxAge)
  );
  setCookie(
    event,
    EXP_TIME_KEY,
    String(expTime),
    createCookieOptions(refreshMaxAge ?? accessMaxAge)
  );
}

export function getJwtCookieMaxAge(token: string): number | undefined {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] || "", "base64url").toString("utf-8")
    );
    if (typeof payload.exp !== "number") return undefined;
    return getEpochMsCookieMaxAge(payload.exp * 1000);
  } catch {
    return undefined;
  }
}

function getEpochMsCookieMaxAge(expTime: string | number): number | undefined {
  const expiresAt = Number(expTime);
  if (!Number.isFinite(expiresAt)) return undefined;
  const maxAge = Math.floor((expiresAt - Date.now()) / 1000);
  return Math.max(0, maxAge);
}

function createCookieOptions(maxAge?: number): AuthCookieOptions {
  const options: AuthCookieOptions = {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: "lax",
    path: "/",
  };

  if (maxAge !== undefined) {
    options.maxAge = maxAge;
    options.expires = new Date(Date.now() + maxAge * 1000);
  }

  return options;
}
