import { normalizeScriptLanguage } from "~/utils/script-contract";

export const OAUTH_LIFECYCLE_SCRIPT_DESCRIPTION =
  "Runs once inside the OAuth transaction. Use @USER for the resolved user and @DATA.oauth for event, provider, profile, claims, accessToken, and token metadata. profile contains providerUserId, email, emailVerified, name, givenName, familyName, username, avatarUrl, profileUrl, and locale. Mutate data through @REPOS and do not return a value.";

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

export async function validateOAuthLifecycleScript(
  form: Record<string, any>,
  errors: Record<string, string>
) {
  const sourceCode = String(form.sourceCode || "").trim();
  if (!sourceCode) {
    delete errors.sourceCode;
    return true;
  }

  const { lintEnfyraScript, validateEnfyraNoReturnScript } = await import(
    "~/utils/editor/enfyraTypeScriptLinter"
  );
  const diagnostics = await lintEnfyraScript(
    sourceCode,
    normalizeScriptLanguage(form.scriptLanguage)
  );
  const error = diagnostics.find((diagnostic) => diagnostic.severity === "error");
  if (error) {
    errors.sourceCode = error.message;
    return false;
  }
  const result = await validateEnfyraNoReturnScript(sourceCode);

  if (result.ok) {
    delete errors.sourceCode;
    return true;
  }

  errors.sourceCode =
    "OAuth lifecycle scripts must perform side effects and must not return a value.";
  return false;
}
