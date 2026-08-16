import { describe, expect, it } from "vitest";
import { isInvalidRefreshSessionError } from "~/utils/enfyra/server/sessionExpiry";

describe("refresh session failure classification", () => {
  it("identifies invalid refresh credentials without treating service failures as logout", () => {
    expect(isInvalidRefreshSessionError({ statusCode: 400 })).toBe(true);
    expect(isInvalidRefreshSessionError({ response: { status: 401 } })).toBe(true);
    expect(isInvalidRefreshSessionError({ status: 403 })).toBe(true);
    expect(isInvalidRefreshSessionError({ statusCode: 503 })).toBe(false);
  });
});
