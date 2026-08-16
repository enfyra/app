import { $fetch } from "ofetch";

let sessionRedirect: Promise<unknown> | null = null;

export function redirectToLoginOnce() {
  if (typeof window === "undefined" || sessionRedirect) return;

  const route = useRoute();
  const { me } = useAuth();
  me.value = null;
  sessionRedirect = Promise.resolve(
    navigateTo({
      path: "/login",
      query: route.path === "/login" ? {} : { redirect: route.fullPath },
      replace: true,
    })
  )
    .catch(() => undefined)
    .finally(() => {
      sessionRedirect = null;
    });
}

export async function useAuthFetch<T>(url: string, options?: any): Promise<T> {
  try {
    return await $fetch<T>(url, options);
  } catch (error: any) {
    const status =
      error?.statusCode ?? error?.status ?? error?.response?.status;
    if (status === 401) {
      redirectToLoginOnce();
    }
    throw error;
  }
}
