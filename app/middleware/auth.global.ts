export default defineNuxtRouteMiddleware(async (to, from) => {
  if (process.env.NODE_ENV === "test") return;

  const { me, fetchUser } = useAuth();

  if (!me.value) {
    await fetchUser({ fields: DEFAULT_ME_FIELDS, silent: to.path === "/login" });
  }

  if (to.path === "/login") {
    if (me.value) return navigateTo("/");
    return;
  }

  if (!me.value) {
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }
});
