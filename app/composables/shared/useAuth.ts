import { ref, computed } from "vue";
import type { User, LoginPayload, LoginResponse, OAuthProvider, UserResponse } from "~/types/auth";
import { getApiErrorRecord, getApiErrorStatus } from "~/utils/api/error";
import { $fetch } from "ofetch";
import { normalizeUrl, getAppUrl } from "~/utils/api/url";
import { resolveOAuthRedirectTarget } from "~/utils/auth";
import { DEFAULT_ME_DEEP } from '~/utils/common/constants';

const me = ref<User | null>(null);
const isLoading = ref<boolean>(false);

export function useAuth() {
  const baseUrl = normalizeUrl(getAppUrl(), "/api");

  const login = async (payload: LoginPayload) => {
    isLoading.value = true;

    try {
      const response = await $fetch<LoginResponse>("/login", {
        method: "POST",
        body: payload,
        baseURL: baseUrl,
      });

      me.value = response?.data?.[0] || null;
      return { ok: true as const, data: response };
    } catch (error: unknown) {
      console.error("[Auth] Login error:", error);
      const failure = getApiErrorRecord(error);
      const response = getApiErrorRecord(failure?.response);
      const data = getApiErrorRecord(failure?.data ?? response?._data);
      const raw =
        data?.statusMessage ??
        data?.message ??
        failure?.statusMessage ??
        failure?.message;
      const message = Array.isArray(raw)
        ? raw.join(". ")
        : typeof raw === "string" && raw.length > 0
          ? raw
          : "Login failed";
      return {
        ok: false as const,
        message,
        statusCode: failure?.statusCode ?? data?.statusCode,
        code: getApiErrorRecord(data?.data)?.code ?? data?.code,
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

  const fetchUser = async (options?: { fields?: string[]; silent?: boolean }) => {
    isLoading.value = true;

    try {
      const queryParams: { deep: typeof DEFAULT_ME_DEEP; fields?: string } = { deep: DEFAULT_ME_DEEP };

      if (options?.fields && options.fields.length > 0) {
        queryParams.fields = options.fields.join(",");
      }

      const response = await useAuthFetch<UserResponse>("/me", {
        method: "GET",
        query: queryParams,
        baseURL: baseUrl,
      });

      me.value = response?.data?.[0] || null;
      return me.value ? 'authenticated' as const : 'unauthenticated' as const;
    } catch (error: unknown) {
      if (!options?.silent) console.error("[Auth] Fetch user error:", error);
      const statusCode = getApiErrorStatus(error);
      if (statusCode === 401) {
        me.value = null;
        return 'unauthenticated' as const;
      }
      return 'unavailable' as const;
    } finally {
      isLoading.value = false;
    }
  };

  const isLoggedIn = computed(() => !!me.value);

  const oauthLogin = (provider: OAuthProvider, redirect?: string) => {
    if (typeof window === "undefined") {
      console.error("[Auth] oauthLogin can only be called on the client side");
      return;
    }

    const currentUrl = window.location.href;
    const targetUrl = resolveOAuthRedirectTarget(redirect, currentUrl);
    const path = `/api/auth/${provider}?redirect=${encodeURIComponent(targetUrl)}`;
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
