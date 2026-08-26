import { createError, getRequestURL, type H3Event } from "h3";
import { getValidatedOrigins } from "../middleware/cors";

const MAX_OAUTH_STATE_LENGTH = 4096;

export async function requireValidRedirectUrl(
  value: unknown,
  event?: H3Event
) {
  if (typeof value !== "string" || value.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Redirect URL is required",
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
    if (!parsed.origin) {
      throw new Error("missing origin");
    }
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Redirect URL must be an absolute http(s) URL",
    });
  }

  const corsCache = await getValidatedOrigins();
  if (corsCache.loaded && corsCache.origins.length > 0) {
    if (!corsCache.origins.includes(parsed.origin)) {
      throw createError({
        statusCode: 403,
        statusMessage: "Redirect origin is not allowed",
      });
    }
  } else if (event) {
    const appOrigin = getRequestURL(event).origin;
    if (parsed.origin !== appOrigin) {
      throw createError({
        statusCode: 403,
        statusMessage: "Redirect origin is not allowed",
      });
    }
  }

  return parsed.toString();
}

export function requireValidOAuthState(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.length > MAX_OAUTH_STATE_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: "OAuth state must be a string no longer than 4096 characters",
    });
  }

  return value;
}

export function requireValidCookieBridgePrefix(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Cookie bridge prefix must be a string",
    });
  }

  const segment = value.trim().replace(/^\/+/, "").split(/[/?#]/)[0];
  if (!segment || segment === ".." || segment.includes("..")) {
    throw createError({
      statusCode: 400,
      statusMessage: "Cookie bridge prefix is invalid",
    });
  }

  return `/${segment}`;
}

export function getNuxtAppOrigin(event: H3Event) {
  return getRequestURL(event).origin;
}

export function buildUrlWithQuery(
  base: string,
  params: Record<string, string | undefined>
) {
  const url = new URL(base);

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.length > 0) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}
