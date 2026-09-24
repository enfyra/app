import { describe, expect, it } from "vitest";
import { sanitizeLoginResponse } from "../../server/utils/auth-response";

describe("sanitizeLoginResponse", () => {
  it("removes every token-bearing field", () => {
    expect(
      sanitizeLoginResponse({
        accessToken: "access",
        refreshToken: "refresh",
        expTime: 123,
        data: [{ id: "user-1" }],
      }),
    ).toEqual({ data: [{ id: "user-1" }] });
  });
});
