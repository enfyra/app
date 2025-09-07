export default defineNuxtRouteMiddleware((to) => {
  // Redirect root path to dashboard
  if (to.path === "/") {
    return navigateTo("/dashboard");
  }
});
