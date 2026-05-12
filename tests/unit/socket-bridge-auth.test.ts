import { describe, expect, it } from "vitest";
import { resolveSocketBridgeAuth } from "../../server/utils/socket-bridge-auth";

function tokenWithExp(exp: number) {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString(
    "base64url"
  );
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `${header}.${payload}.`;
}

describe("socket bridge auth", () => {
  it("accepts a valid access token cookie without rotating refresh tokens", async () => {
    const accessToken = tokenWithExp(Math.floor(Date.now() / 1000) + 3600);
    const req = {
      headers: {
        cookie: `accessToken=${accessToken}; refreshToken=still-present`,
      },
    };

    await expect(resolveSocketBridgeAuth(req as any)).resolves.toEqual({
      ok: true,
      upstreamHeaders: { cookie: req.headers.cookie },
    });
  });

  it("rejects expired access token cookies even when refresh token exists", async () => {
    const accessToken = tokenWithExp(Math.floor(Date.now() / 1000) - 3600);
    const req = {
      headers: {
        cookie: `accessToken=${accessToken}; refreshToken=valid-refresh`,
      },
    };

    await expect(resolveSocketBridgeAuth(req as any)).resolves.toEqual({
      ok: false,
    });
  });
});
