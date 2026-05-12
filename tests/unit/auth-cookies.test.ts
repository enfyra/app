import { describe, expect, it, vi } from "vitest";
import { getJwtCookieMaxAge } from "~/utils/enfyra/server/authCookies";

function tokenWithExp(exp: number) {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString(
    "base64url"
  );
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `${header}.${payload}.`;
}

describe("auth cookie lifetime", () => {
  it("derives persistent cookie maxAge from JWT exp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-12T00:00:00.000Z"));

    const expiresInOneHour = Math.floor(Date.now() / 1000) + 3600;

    expect(getJwtCookieMaxAge(tokenWithExp(expiresInOneHour))).toBe(3600);

    vi.useRealTimers();
  });

  it("ignores malformed JWTs instead of inventing a lifetime", () => {
    expect(getJwtCookieMaxAge("not-a-token")).toBeUndefined();
  });
});
