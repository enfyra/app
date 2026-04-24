import { describe, expect, it } from "vitest";
import { resolveOAuthRedirectTarget } from "~/utils/auth";

describe("resolveOAuthRedirectTarget", () => {
  it("returns current URL when redirect is missing", () => {
    expect(
      resolveOAuthRedirectTarget(undefined, "https://admin.example.com/login")
    ).toBe("https://admin.example.com/login");
  });

  it("resolves relative redirects against the current URL origin", () => {
    expect(
      resolveOAuthRedirectTarget(
        "/settings/routes?id=1",
        "https://admin.example.com/login?redirect=%2Fsettings%2Froutes"
      )
    ).toBe("https://admin.example.com/settings/routes?id=1");
  });

  it("keeps absolute redirects unchanged", () => {
    expect(
      resolveOAuthRedirectTarget(
        "https://client.example.com/current-page",
        "https://admin.example.com/login"
      )
    ).toBe("https://client.example.com/current-page");
  });

  it("falls back to current URL for malformed redirects", () => {
    expect(
      resolveOAuthRedirectTarget(
        "http://[broken",
        "https://admin.example.com/login"
      )
    ).toBe("https://admin.example.com/login");
  });
});
