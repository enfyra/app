import { $fetch, type FetchOptions, type MappedResponseType, type ResponseType } from "ofetch";
import { getApiErrorStatus } from "~/utils/api/error";

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

export async function useAuthFetch<T = unknown, R extends ResponseType = "json">(
  url: string,
  options?: FetchOptions<R>,
): Promise<MappedResponseType<R, T>> {
  try {
    return await $fetch<T, R>(url, options);
  } catch (error: unknown) {
    if (getApiErrorStatus(error) === 401) {
      redirectToLoginOnce();
    }
    throw error;
  }
}
