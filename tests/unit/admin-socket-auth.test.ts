import { beforeEach, describe, expect, it, vi } from "vitest";

import { stopAdminSocketReconnectOnAuthError } from "../../app/composables/shared/useAdminSocket";
import { ENFYRA_SOCKET_AUTH_ERROR } from "../../app/constants/enfyra";

const disconnectMock = vi.fn();
const reconnectionMock = vi.fn();

describe("useAdminSocket auth failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stops reconnecting when the bridge reports missing auth", async () => {
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
