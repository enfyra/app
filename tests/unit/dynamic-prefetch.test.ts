import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../../app/composables/dynamic/prefetch.ts", import.meta.url),
  "utf8",
);

describe("dynamic extension prefetch", () => {
  it("caches metadata without executing extension code", () => {
    expect(source).toContain("setCachedExtensionMeta(cacheKey, extension)");
    expect(source).not.toContain("loadDynamicComponent(");
  });
});
