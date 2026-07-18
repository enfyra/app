export default defineNuxtRouteMiddleware(async (to) => {
  if (process.env.NODE_ENV === "test") return;

  const { me, fetchUser } = useAuth();
  let authState: 'authenticated' | 'unauthenticated' | 'unavailable' = me.value
    ? 'authenticated'
    : 'unauthenticated';

  if (!me.value) {
    authState = await fetchUser({
      fields: DEFAULT_ME_FIELDS,
      silent: to.path === "/login",
    });
  }

  if (to.path === "/login") {
    if (me.value) return navigateTo("/");
    return;
  }

  if (authState === 'unavailable') {
    throw createError({
      statusCode: 503,
      statusMessage: 'Authentication service is unavailable',
      message: 'Your session could not be verified. Please try again shortly.',
    });
  }

  if (!me.value) {
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }
});
