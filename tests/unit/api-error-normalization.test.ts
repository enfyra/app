import { describe, expect, it } from "vitest";
import { getApiErrorEnvelope, getApiErrorStatus, normalizeApiError } from "~/utils/api/error";

describe("API failure normalization", () => {
  it("keeps wrapped backend errors and response metadata", () => {
    const data = { error: { code: "DENIED", message: ["Not allowed", "Try another route"] } };
    const response = { status: 403, statusText: "Forbidden", _data: data, url: "/api/private" };
    expect(normalizeApiError({ response })).toEqual({
      message: "Not allowed. Try another route",
      status: 403,
      statusMessage: "Forbidden",
      url: "/api/private",
      data,
      response,
    });
    expect(getApiErrorEnvelope(data)).toEqual(data.error);
  });

  it("preserves fetch-message and direct-data precedence", () => {
    const data = { message: "Backend detail" };
    const error = { message: "Fetch failed", statusCode: 503, data, response: { status: 401, data: "fallback" } };
    expect(normalizeApiError(error, "/api/items")).toMatchObject({
      message: "Fetch failed", status: 503, data, url: "/api/items",
    });
    expect(getApiErrorStatus(error)).toBe(503);
  });

  it.each([undefined, null, 4, "failure", false, { response: null }])("handles non-fetch failures without inspecting unchecked fields: %s", error => {
    expect(normalizeApiError(error).message).toBe("Request failed");
    expect(getApiErrorStatus(error)).toBeUndefined();
    expect(getApiErrorEnvelope(error)?.message).toBeUndefined();
  });

  it("never interprets a string status as an authenticated-session expiry", () => {
    expect(getApiErrorStatus({ statusCode: "401" })).toBeUndefined();
    expect(getApiErrorStatus({ response: { status: 401 } })).toBe(401);
  });
});
