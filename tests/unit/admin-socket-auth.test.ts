import { beforeEach, describe, expect, it, vi } from "vitest";

const disconnectMock = vi.fn();
const reconnectionMock = vi.fn();

describe("useAdminSocket auth failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stops reconnecting when the bridge reports missing auth", async () => {
    const { stopAdminSocketReconnectOnAuthError } = await import(
      "../../app/composables/shared/useAdminSocket"
    );
    const { ENFYRA_SOCKET_AUTH_ERROR } = await import(
      "../../app/constants/enfyra"
    );
    const socket = {
      disconnect: disconnectMock,
      io: {
        reconnection: reconnectionMock,
        opts: {
          reconnection: true,
        },
      },
    };

    expect(
      stopAdminSocketReconnectOnAuthError(
        socket as any,
        new Error(ENFYRA_SOCKET_AUTH_ERROR)
      )
    ).toBe(true);

    expect(reconnectionMock).toHaveBeenCalledWith(false);
    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });

  it("leaves normal transient errors reconnectable", async () => {
    const { stopAdminSocketReconnectOnAuthError } = await import(
      "../../app/composables/shared/useAdminSocket"
    );
    const socket = {
      disconnect: disconnectMock,
      io: {
        reconnection: reconnectionMock,
        opts: {
          reconnection: true,
        },
      },
    };

    expect(
      stopAdminSocketReconnectOnAuthError(socket as any, new Error("timeout"))
    ).toBe(false);

    expect(reconnectionMock).not.toHaveBeenCalled();
    expect(disconnectMock).not.toHaveBeenCalled();
  });
});
