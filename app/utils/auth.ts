export function resolveOAuthRedirectTarget(
  redirect: string | undefined,
  currentUrl: string,
) {
  try {
    if (redirect && redirect.length > 0) {
      return new URL(redirect, currentUrl).toString();
    }

    return currentUrl;
  } catch {
    return currentUrl;
  }
}
