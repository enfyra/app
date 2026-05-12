import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteCookie = vi.fn();
const setCookie = vi.fn();
const getCookie = vi.fn();
const fetchMock = vi.fn();

vi.mock("h3", () => ({
  deleteCookie,
  getCookie,
  setCookie,
}));

vi.mock("ofetch", () => ({
  $fetch: fetchMock,
}));

describe("refreshAccessToken race behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("does not delete auth cookies when refresh fails", async () => {
    const { refreshAccessToken } = await import(
      "~/utils/enfyra/server/refreshToken"
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    fetchMock.mockRejectedValueOnce(new Error("already used"));

    await expect(
      refreshAccessToken({} as any, "old-refresh-token", "https://api.test")
    ).rejects.toThrow("already used");

    expect(deleteCookie).not.toHaveBeenCalled();
    expect(setCookie).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      "Token refresh failed:",
      expect.any(Error)
    );
    warn.mockRestore();
  });

  it("dedupes many parallel HTTP refreshes for the same old refresh token", async () => {
    const { refreshAccessToken } = await import(
      "~/utils/enfyra/server/refreshToken"
    );
    const response = {
      accessToken: tokenWithExp(Math.floor(Date.now() / 1000) + 900),
      refreshToken: tokenWithExp(Math.floor(Date.now() / 1000) + 86400),
      expTime: Date.now() + 900_000,
    };
    let resolveRefresh!: (value: typeof response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      })
    );

    const events = Array.from({ length: 20 }, () => ({}) as any);
    const calls = events.map((event) =>
      refreshAccessToken(event, "same-old-refresh-token", "https://api.test")
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveRefresh(response);

    await expect(Promise.all(calls)).resolves.toEqual(
      Array(20).fill(response.accessToken)
    );
    expect(setCookie).toHaveBeenCalledTimes(60);
    expect(deleteCookie).not.toHaveBeenCalled();
  });

  it("reuses a just-rotated refresh result for late requests with the old token", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-12T00:00:00.000Z"));
    const { refreshAccessToken } = await import(
      "~/utils/enfyra/server/refreshToken"
    );
    const response = {
      accessToken: tokenWithExp(Math.floor(Date.now() / 1000) + 900),
      refreshToken: tokenWithExp(Math.floor(Date.now() / 1000) + 86400),
      expTime: Date.now() + 900_000,
    };

    fetchMock.mockResolvedValueOnce(response);

    await expect(
      refreshAccessToken(
        {} as any,
        "old-refresh-token-reuse",
        "https://api.test"
      )
    ).resolves.toBe(response.accessToken);
    await expect(
      refreshAccessToken(
        {} as any,
        "old-refresh-token-reuse",
        "https://api.test"
      )
    ).resolves.toBe(response.accessToken);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(setCookie).toHaveBeenCalledTimes(6);

    vi.advanceTimersByTime(2001);
    fetchMock.mockResolvedValueOnce(response);

    await expect(
      refreshAccessToken(
        {} as any,
        "old-refresh-token-reuse",
        "https://api.test"
      )
    ).resolves.toBe(response.accessToken);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps socket reconnects from rotating tokens while HTTP requests refresh once", async () => {
    const [{ refreshAccessToken }, { resolveSocketBridgeAuth }] =
      await Promise.all([
        import("~/utils/enfyra/server/refreshToken"),
        import("../../server/utils/socket-bridge-auth"),
      ]);
    const oldAccessToken = tokenWithExp(Math.floor(Date.now() / 1000) - 60);
    const response = {
      accessToken: tokenWithExp(Math.floor(Date.now() / 1000) + 900),
      refreshToken: tokenWithExp(Math.floor(Date.now() / 1000) + 86400),
      expTime: Date.now() + 900_000,
    };
    let resolveRefresh!: (value: typeof response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      })
    );

    const socketReconnects = Array.from({ length: 15 }, () =>
      resolveSocketBridgeAuth({
        headers: {
          cookie: `accessToken=${oldAccessToken}; refreshToken=old-refresh-token`,
        },
      } as any)
    );
    const httpRequests = Array.from({ length: 15 }, () =>
      refreshAccessToken({} as any, "old-refresh-token", "https://api.test")
    );

    await expect(Promise.all(socketReconnects)).resolves.toEqual(
      Array(15).fill({ ok: false })
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveRefresh(response);

    await expect(Promise.all(httpRequests)).resolves.toEqual(
      Array(15).fill(response.accessToken)
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(setCookie).toHaveBeenCalledTimes(45);
    expect(deleteCookie).not.toHaveBeenCalled();
  });
});

function tokenWithExp(exp: number) {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString(
    "base64url"
  );
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `${header}.${payload}.`;
}
