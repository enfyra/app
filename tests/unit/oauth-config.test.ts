import { describe, expect, it } from "vitest";
import {
  buildOAuthRedirectUri,
  isValidAbsoluteHttpUrl,
  validateOAuthConfigForm,
  validateOAuthLifecycleScript,
} from "~/utils/oauth-config";

describe("oauth config validation", () => {
  it("accepts absolute http(s) URLs", () => {
    expect(isValidAbsoluteHttpUrl("https://example.com/callback")).toBe(true);
    expect(isValidAbsoluteHttpUrl("http://localhost:3000/path")).toBe(true);
  });

  it("rejects relative or invalid URLs", () => {
    expect(isValidAbsoluteHttpUrl("/local/path")).toBe(false);
    expect(isValidAbsoluteHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isValidAbsoluteHttpUrl("")).toBe(false);
  });

  it("builds provider callback URLs from the app origin", () => {
    expect(buildOAuthRedirectUri("google", "https://admin.example.com")).toBe(
      "https://admin.example.com/api/auth/google/callback"
    );
    expect(buildOAuthRedirectUri("github", "http://localhost:3000/")).toBe(
      "http://localhost:3000/api/auth/github/callback"
    );
  });

  it("does not build provider callback URLs without a provider or origin", () => {
    expect(buildOAuthRedirectUri("", "https://admin.example.com")).toBe("");
    expect(buildOAuthRedirectUri("google", "/admin")).toBe("");
  });

  it("requires appCallbackUrl when auto cookie handling is disabled", () => {
    const errors: Record<string, string> = {};
    const isValid = validateOAuthConfigForm(
      {
        redirectUri: "https://api.example.com/auth/google/callback",
        autoSetCookies: false,
        appCallbackUrl: "",
      },
      errors
    );

    expect(isValid).toBe(false);
    expect(errors.appCallbackUrl).toContain("absolute http(s) URL");
  });

  it("allows empty appCallbackUrl when auto cookie handling is enabled", () => {
    const errors: Record<string, string> = {};
    const isValid = validateOAuthConfigForm(
      {
        redirectUri: "https://api.example.com/auth/google/callback",
        autoSetCookies: true,
        appCallbackUrl: "",
      },
      errors
    );

    expect(isValid).toBe(true);
    expect(errors.appCallbackUrl).toBeUndefined();
  });

  it("accepts OAuth lifecycle scripts that use @USER and @DATA without returning", async () => {
    const errors: Record<string, string> = {};
    const isValid = await validateOAuthLifecycleScript(
      {
        sourceCode:
          "await @REPOS.enfyra_user.update({ id: @USER.id, data: { avatar: @DATA.oauth.profile.avatarUrl } })",
        scriptLanguage: "typescript",
      },
      errors
    );

    expect(isValid).toBe(true);
    expect(errors.sourceCode).toBeUndefined();
  });

  it("allows empty OAuth lifecycle scripts", async () => {
    const errors: Record<string, string> = { sourceCode: "Previous error" };
    const isValid = await validateOAuthLifecycleScript(
      {
        sourceCode: null,
        scriptLanguage: "typescript",
      },
      errors
    );

    expect(isValid).toBe(true);
    expect(errors.sourceCode).toBeUndefined();
  });

  it("rejects return values from OAuth lifecycle scripts", async () => {
    const errors: Record<string, string> = {};
    const isValid = await validateOAuthLifecycleScript(
      {
        sourceCode: "return { role: { id: 2 } }",
        scriptLanguage: "typescript",
      },
      errors
    );

    expect(isValid).toBe(false);
    expect(errors.sourceCode).toContain("must not return a value");
  });

  it("rejects invalid OAuth lifecycle script syntax", async () => {
    const errors: Record<string, string> = {};
    const isValid = await validateOAuthLifecycleScript(
      {
        sourceCode: "const broken = ;",
        scriptLanguage: "typescript",
      },
      errors
    );

    expect(isValid).toBe(false);
    expect(errors.sourceCode).toBeTruthy();
  });
});
