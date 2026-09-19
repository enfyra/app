import { describe, expect, it } from "vitest";
import {
  bindOAuthBrowserRedirect,
  verifyOAuthBrowserRedirect,
} from "../../server/utils/oauth-browser-state";

describe("OAuth browser state", () => {
  it("round-trips the redirect only for the initiating browser nonce", () => {
    const wrapped = bindOAuthBrowserRedirect(
      "https://client.example.com/callback?state=client-state",
      "browser-nonce",
    );

    expect(verifyOAuthBrowserRedirect(wrapped, "browser-nonce")).toBe(
      "https://client.example.com/callback?state=client-state",
    );
    expect(() =>
      verifyOAuthBrowserRedirect(wrapped, "different-browser"),
    ).toThrow();
  });

  it("replaces a caller-supplied internal nonce parameter", () => {
    const wrapped = bindOAuthBrowserRedirect(
      "https://client.example.com/callback?__enfyra_oauth_nonce=attacker",
      "browser-nonce",
    );

    expect(verifyOAuthBrowserRedirect(wrapped, "browser-nonce")).toBe(
      "https://client.example.com/callback",
    );
  });

  it("rejects a redirect without a browser nonce", () => {
    expect(() =>
      verifyOAuthBrowserRedirect(
        "https://client.example.com/callback",
        "browser-nonce",
      ),
    ).toThrow();
  });
});
