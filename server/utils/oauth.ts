import { createError, getRequestURL, type H3Event } from "h3";

export function requireValidRedirectUrl(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Redirect URL is required",
    });
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
    if (!parsed.origin) {
      throw new Error("missing origin");
    }
    return parsed.toString();
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Redirect URL must be an absolute http(s) URL",
    });
  }
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
