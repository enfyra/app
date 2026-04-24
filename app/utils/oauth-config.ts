export function isValidAbsoluteHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.origin.length > 0
    );
  } catch {
    return false;
  }
}

export function validateOAuthConfigForm(
  form: Record<string, any>,
  errors: Record<string, string>
) {
  let isValid = true;

  if (!isValidAbsoluteHttpUrl(form.redirectUri)) {
    errors.redirectUri =
      "Must be an absolute http(s) URL that points to your backend OAuth callback.";
    isValid = false;
  } else {
    delete errors.redirectUri;
  }

  const appCallbackUrl = form.appCallbackUrl;
  const autoSetCookies = form.autoSetCookies === true;

  if (!autoSetCookies && !isValidAbsoluteHttpUrl(appCallbackUrl)) {
    errors.appCallbackUrl =
      "Must be an absolute http(s) URL when auto cookie handling is disabled.";
    isValid = false;
  } else if (
    typeof appCallbackUrl === "string" &&
    appCallbackUrl.length > 0 &&
    !isValidAbsoluteHttpUrl(appCallbackUrl)
  ) {
    errors.appCallbackUrl = "Must be an absolute http(s) URL.";
    isValid = false;
  } else {
    delete errors.appCallbackUrl;
  }

  return isValid;
}
