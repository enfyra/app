import { ref, computed } from "vue";
import type { User, LoginPayload, OAuthProvider } from "~/types";
import { $fetch } from "ofetch";
import { normalizeUrl, getAppUrl } from "~/utils/api/url";

const me = ref<User | null>(null);
const isLoading = ref<boolean>(false);

export function useAuth() {
  const baseUrl = normalizeUrl(getAppUrl(), "/api");

  const login = async (payload: LoginPayload) => {
    isLoading.value = true;

    try {
      const response = await $fetch("/login", {
        method: "POST",
        body: payload,
        baseURL: baseUrl,
      });

      me.value = (response as any)?.data?.[0] || null;
      return { ok: true as const, data: response };
    } catch (error: any) {
      console.error("[Auth] Login error:", error);
      const data = error?.data ?? error?.response?._data;
      const raw =
        data?.statusMessage ??
        data?.message ??
        error?.statusMessage ??
        error?.message;
      const message = Array.isArray(raw)
        ? raw.join(". ")
        : typeof raw === "string" && raw.length > 0
          ? raw
          : "Login failed";
      return {
        ok: false as const,
        message,
        statusCode: error?.statusCode ?? data?.statusCode,
        code: data?.data?.code ?? data?.code,
      };
    } finally {
      isLoading.value = false;
    }
  };

  const logout = async () => {
    isLoading.value = true;

    try {
      await $fetch("/logout", {
        method: "POST",
        baseURL: baseUrl,
      });
      me.value = null;

      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (error) {
      console.error("[Auth] Logout error:", error);
      me.value = null;
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } finally {
      isLoading.value = false;
    }
  };

  const fetchUser = async (options?: { fields?: string[] }) => {
    isLoading.value = true;

    try {
      const queryParams: any = {};

      if (options?.fields && options.fields.length > 0) {
        queryParams.fields = options.fields.join(",");
      }

      const response = await $fetch("/me", {
        method: "GET",
        query: queryParams,
        baseURL: baseUrl,
      });

      me.value = (response as any)?.data?.[0] || null;
    } catch (error) {
      console.error("[Auth] Fetch user error:", error);
      me.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  const isLoggedIn = computed(() => !!me.value);

  const oauthLogin = (provider: OAuthProvider) => {
    if (typeof window === "undefined") {
      console.error("[Auth] oauthLogin can only be called on the client side");
      return;
    }

    const currentUrl = window.location.href;
    const path = `/api/auth/${provider}?redirect=${encodeURIComponent(currentUrl)}`;
    window.location.href = path.startsWith("/") ? path : `/${path}`;
  };

  return {
    me,
    login,
    logout,
    fetchUser,
    isLoggedIn,
    oauthLogin,
    isLoading,
  } as const;
}
