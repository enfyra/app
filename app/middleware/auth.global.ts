export default defineNuxtRouteMiddleware(async (to, from) => {
  if (process.env.NODE_ENV === "test") return;

  const { me, fetchUser } = useAuth();

  if (to.path === "/login") {
    if (me.value) return navigateTo("/");
    return;
  }

  if (!me.value) {
    await fetchUser({ fields: DEFAULT_ME_FIELDS });
  }

  if (!me.value) {
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }
});
