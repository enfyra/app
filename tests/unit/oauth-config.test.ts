import { describe, expect, it } from "vitest";
import {
  isValidAbsoluteHttpUrl,
  validateOAuthConfigForm,
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
});
