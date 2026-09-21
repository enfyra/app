import { describe, expect, it, vi } from "vitest";
import { Decoder, PacketType } from "socket.io-parser";
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
  it("preserves the observed socket peer after untrusted forwarding headers", async () => {
    const req = { headers: { 'x-enfyra-pat': 'efy_pat_test', 'x-forwarded-for': '1.1.1.1' }, socket: { remoteAddress: '198.51.100.20' } };
    await expect(resolveSocketBridgeAuth(req as any)).resolves.toEqual({
      ok: true,
      upstreamHeaders: { 'x-enfyra-client-context': expect.any(String), 'x-enfyra-pat': 'efy_pat_test', 'x-forwarded-for': '1.1.1.1, 198.51.100.20' },
    });
  });
  it("forwards the native ESV PAT header without treating it as a JWT", async () => {
    const req = {
      headers: {
        "x-enfyra-pat": "efy_pat_test",
      },
    };

    await expect(resolveSocketBridgeAuth(req as any)).resolves.toEqual({
      ok: true,
      upstreamHeaders: { 'x-enfyra-client-context': expect.any(String), "x-enfyra-pat": "efy_pat_test", "x-forwarded-for": "unknown" },
    });
  });

  it("accepts a valid access token cookie without rotating refresh tokens", async () => {
    const accessToken = tokenWithExp(Math.floor(Date.now() / 1000) + 3600);
    const req = {
      headers: {
        cookie: `accessToken=${accessToken}; refreshToken=still-present`,
      },
    };

    await expect(resolveSocketBridgeAuth(req as any)).resolves.toEqual({
      ok: true,
      upstreamHeaders: { 'x-enfyra-client-context': expect.any(String), cookie: req.headers.cookie, "x-forwarded-for": "unknown" },
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
        '4{"message":"Connection rejected","data":{"code":"AUTH_REQUIRED"}}'
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

    for (const [sender, namespace] of [
      [send, '/ws/chat'],
      [externalSend, '/chat'],
      [defaultSend, '/ws/enfyra-admin'],
    ] as const) {
      expect(sender).toHaveBeenCalledTimes(1);
      const decoder = new Decoder();
      const decoded = vi.fn();
      decoder.on('decoded', decoded);
      expect(() => decoder.add(sender.mock.calls[0]?.[0])).not.toThrow();
      expect(decoded).toHaveBeenCalledWith({
        type: PacketType.CONNECT_ERROR,
        nsp: namespace,
        data: { message: ENFYRA_SOCKET_AUTH_ERROR },
      });
      decoder.destroy();
    }
  });
});
