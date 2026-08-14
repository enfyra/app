import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, me, navigateTo, route } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  me: { value: null as any },
  navigateTo: vi.fn(),
  route: {
    fullPath: "/settings/users?page=2",
    path: "/settings/users",
  },
}));

vi.mock("ofetch", () => ({
  $fetch: fetchMock,
}));

mockNuxtImport("useAuth", () => () => ({ me }));
mockNuxtImport("useRoute", () => () => route);
mockNuxtImport("navigateTo", () => navigateTo);

import { useAuthFetch } from "~/composables/shared/useSessionExpiry";

describe("client session expiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("window", {});
    me.value = { id: "user-1" };
    navigateTo.mockResolvedValue(undefined);
  });

  it("redirects once when concurrent protected requests receive 401", async () => {
    fetchMock.mockRejectedValue({ statusCode: 401 });

    await Promise.allSettled([
      useAuthFetch("/api/enfyra_user"),
      useAuthFetch("/api/enfyra_role"),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(me.value).toBeNull();
    expect(navigateTo).toHaveBeenCalledTimes(1);
    expect(navigateTo).toHaveBeenCalledWith({
      path: "/login",
      query: { redirect: "/settings/users?page=2" },
      replace: true,
    });
  });
});
