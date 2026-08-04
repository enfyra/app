import { describe, expect, it, vi } from "vitest";
import {
  classifyUpstreamSocketIoPacket,
  resolveSocketBridgeAuth,
  sendSocketBridgeAuthError,
} from "../../server/utils/socket-bridge-auth";
import { ENFYRA_SOCKET_AUTH_ERROR } from "../../app/constants/enfyra";

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

  it("rejects expired bearer tokens before opening an upstream socket", async () => {
    const accessToken = tokenWithExp(Math.floor(Date.now() / 1000) - 3600);

    await expect(
      resolveSocketBridgeAuth({
        headers: { authorization: `Bearer ${accessToken}` },
      } as any)
    ).resolves.toEqual({ ok: false });
  });

  it("recognizes namespace authentication failures from message or error code", () => {
    expect(
      classifyUpstreamSocketIoPacket(
        '4/enfyra-admin,{"message":"Invalid authentication token","data":{"code":"AUTH_INVALID"}}'
      )
    ).toBe("auth_error");
    expect(
      classifyUpstreamSocketIoPacket(
        '4/chat,{"message":"Connection rejected","data":{"code":"AUTH_REQUIRED"}}'
      )
    ).toBe("auth_error");
    expect(
      classifyUpstreamSocketIoPacket(
        `4/enfyra-admin,{"message":"${ENFYRA_SOCKET_AUTH_ERROR}"}`
      )
    ).toBe("auth_error");
  });

  it("distinguishes namespace success and unrelated Socket.IO traffic", () => {
    expect(
      classifyUpstreamSocketIoPacket(
        '0/enfyra-admin,{"sid":"connected-socket"}'
      )
    ).toBe("connected");
    expect(
      classifyUpstreamSocketIoPacket(
        '4/enfyra-admin,{"message":"Gateway not configured"}'
      )
    ).toBe("other");
    expect(
      classifyUpstreamSocketIoPacket(
        '2/enfyra-admin,["event","Invalid authentication token"]'
      )
    ).toBe("other");
    expect(classifyUpstreamSocketIoPacket("4/enfyra-admin,not-json")).toBe(
      "other"
    );
  });

  it("emits the stable bridge auth error on the initiating browser namespace", () => {
    const send = vi.fn();
    const externalSend = vi.fn();
    const defaultSend = vi.fn();

    sendSocketBridgeAuthError({ send }, "/ws/chat");
    sendSocketBridgeAuthError({ send: externalSend }, "/chat");
    sendSocketBridgeAuthError({ send: defaultSend });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toContain("44/ws/chat,");
    expect(send.mock.calls[0]?.[0]).toContain(ENFYRA_SOCKET_AUTH_ERROR);
    expect(externalSend).toHaveBeenCalledTimes(1);
    expect(externalSend.mock.calls[0]?.[0]).toContain("44/chat,");
    expect(externalSend.mock.calls[0]?.[0]).not.toContain("44/ws/chat,");
    expect(defaultSend.mock.calls[0]?.[0]).toContain("44/ws/enfyra-admin,");
  });
});
