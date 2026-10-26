import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../../app/composables/dynamic/prefetch.ts", import.meta.url),
  "utf8",
);

describe("dynamic extension prefetch", () => {
  it("coordinates speculative work without mounting or prefetching page data", () => {
    expect(source).toContain("createExtensionLoadScheduler");
    expect(source).toContain("loadDynamicComponent(extension.compiledCode");
    expect(source).not.toContain("createApp(");
    expect(source).not.toContain(".mount(");
  });
});
