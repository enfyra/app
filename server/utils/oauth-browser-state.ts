import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  createError,
  deleteCookie,
  getCookie,
  getRequestURL,
  setCookie,
  type H3Event,
} from "h3";

const OAUTH_BROWSER_NONCE_COOKIE = "enfyra_oauth_nonce";
const OAUTH_BROWSER_NONCE_QUERY = "__enfyra_oauth_nonce";

function rejectOAuthBrowserState(): never {
  throw createError({
    statusCode: 403,
    statusMessage: "OAuth flow was not initiated by this browser",
  });
}

function nonceMatches(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function bindOAuthBrowserRedirect(redirect: string, nonce: string) {
  const url = new URL(redirect);
  url.searchParams.set(OAUTH_BROWSER_NONCE_QUERY, nonce);
  return url.toString();
}

export function verifyOAuthBrowserRedirect(
  redirect: string,
  expectedNonce: string,
) {
  const url = new URL(redirect);
  const actualNonce = url.searchParams.get(OAUTH_BROWSER_NONCE_QUERY);
  if (!actualNonce || !nonceMatches(actualNonce, expectedNonce)) {
    rejectOAuthBrowserState();
  }
  url.searchParams.delete(OAUTH_BROWSER_NONCE_QUERY);
  return url.toString();
}

export function createOAuthBrowserBinding(event: H3Event, redirect: string) {
  const nonce = randomBytes(32).toString("base64url");
  setCookie(event, OAUTH_BROWSER_NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: getRequestURL(event).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return bindOAuthBrowserRedirect(redirect, nonce);
}

export function consumeOAuthBrowserBinding(event: H3Event, redirect: string) {
  const nonce = getCookie(event, OAUTH_BROWSER_NONCE_COOKIE);
  if (!nonce) rejectOAuthBrowserState();
  const verifiedRedirect = verifyOAuthBrowserRedirect(redirect, nonce);
  deleteCookie(event, OAUTH_BROWSER_NONCE_COOKIE, { path: "/" });
  return verifiedRedirect;
}
