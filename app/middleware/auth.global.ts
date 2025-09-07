import { DEFAULT_ME_FIELDS } from "~/utils/common/constants";

export default defineNuxtRouteMiddleware(async (to, from) => {
  const { me, fetchUser } = useEnfyraAuth();

  if (!me.value) {
    await fetchUser({ fields: DEFAULT_ME_FIELDS });
  }

  // If no user yet → call fetchUser
  if (to.path !== "/login") {
    if (!me.value) {
      return navigateTo("/login");
    }
  }

  if (to.path === "/login" && me.value) {
    return navigateTo("/");
  }
});
