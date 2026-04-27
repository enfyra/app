import { describe, expect, it } from "vitest";
import {
  buildOAuthRedirectUri,
  isValidAbsoluteHttpUrl,
  validateOAuthConfigForm,
  validateOAuthUserProvisioningScript,
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

  it("accepts OAuth user provisioning scripts that return objects", async () => {
    const errors: Record<string, string> = {};
    const isValid = await validateOAuthUserProvisioningScript(
      {
        sourceCode: "return { role: { id: 2 } }",
        scriptLanguage: "typescript",
      },
      errors
    );

    expect(isValid).toBe(true);
    expect(errors.sourceCode).toBeUndefined();
  });

  it("allows empty OAuth user provisioning scripts", async () => {
    const errors: Record<string, string> = { sourceCode: "Previous error" };
    const isValid = await validateOAuthUserProvisioningScript(
      {
        sourceCode: null,
        scriptLanguage: "typescript",
      },
      errors
    );

    expect(isValid).toBe(true);
    expect(errors.sourceCode).toBeUndefined();
  });

  it("rejects OAuth user provisioning scripts that do not return objects", async () => {
    const errors: Record<string, string> = {};
    const isValid = await validateOAuthUserProvisioningScript(
      {
        sourceCode: "return null",
        scriptLanguage: "typescript",
      },
      errors
    );

    expect(isValid).toBe(false);
    expect(errors.sourceCode).toContain("Must return an object");
  });
});
