export default defineNuxtRouteMiddleware(async (to, from) => {
  const { me, fetchUser } = useAuth();

  if (!me.value) {
    await fetchUser({ fields: DEFAULT_ME_FIELDS });
  }

  if (to.path !== "/login") {
    if (!me.value) {
      return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
    }
  }

  if (to.path === "/login" && me.value) {
    return navigateTo("/");
  }
});
