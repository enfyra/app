import { describe, expect, it } from "vitest";
import { buildPackageProxyHeaders } from "../../app/utils/enfyra/server/packageProxy";

describe("package proxy authentication", () => {
  it("forwards native PAT authentication", () => {
    expect(buildPackageProxyHeaders(undefined, undefined, "efy_pat_test")).toEqual({
      "x-enfyra-pat": "efy_pat_test",
    });
  });

  it("preserves browser and bearer authentication", () => {
    expect(buildPackageProxyHeaders("session=cookie", "Bearer token", undefined)).toEqual({
      cookie: "session=cookie",
      authorization: "Bearer token",
    });
  });
});
