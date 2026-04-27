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

export function buildOAuthRedirectUri(provider: unknown, origin: unknown) {
  if (typeof provider !== "string" || provider.length === 0) {
    return "";
  }
  if (typeof origin !== "string" || !isValidAbsoluteHttpUrl(origin)) {
    return "";
  }

  return `${origin.replace(/\/+$/, "")}/api/auth/${provider}/callback`;
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

export async function validateOAuthUserProvisioningScript(
  form: Record<string, any>,
  errors: Record<string, string>
) {
  const sourceCode = String(form.sourceCode || "").trim();
  if (!sourceCode) {
    delete errors.sourceCode;
    return true;
  }

  const { validateEnfyraObjectReturnScript } = await import(
    "~/utils/editor/enfyraTypeScriptLinter"
  );
  const result = await validateEnfyraObjectReturnScript(
    sourceCode,
    form.scriptLanguage === "javascript" ? "javascript" : "typescript"
  );

  if (result.ok) {
    delete errors.sourceCode;
    return true;
  }

  errors.sourceCode = `Must return an object. ${result.message}`;
  return false;
}
