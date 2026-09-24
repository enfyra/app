import { describe, expect, it } from "vitest";
import {
  assertValidApiIdentifiers,
  buildApiPath,
  runBoundedApiBatch,
  shouldCancelPreviousApiRequest,
} from "~/utils/api/execution";

describe("API execution targets", () => {
  it("preserves zero-valued identifiers", () => {
    expect(buildApiPath("/api/notes", 0)).toBe("/api/notes/0");
  });

  it("rejects a missing single-record identifier", () => {
    expect(() => assertValidApiIdentifiers({ id: "" })).toThrow(
      "Record id is required",
    );
  });

  it("rejects an empty or partially invalid batch", () => {
    expect(() => assertValidApiIdentifiers({ ids: [] })).toThrow(
      "At least one record id is required",
    );
    expect(() => assertValidApiIdentifiers({ ids: ["note-1", null] })).toThrow(
      "Every record id is required",
    );
  });

  it("cancels stale reads but never mutations by default", () => {
    expect(shouldCancelPreviousApiRequest("GET")).toBe(true);
    expect(shouldCancelPreviousApiRequest("PATCH")).toBe(false);
    expect(shouldCancelPreviousApiRequest("DELETE")).toBe(false);
    expect(shouldCancelPreviousApiRequest("PATCH", true)).toBe(true);
  });

  it("waits for every bounded batch item before surfacing a failure", async () => {
    const completed: number[] = [];
    let active = 0;
    let maxActive = 0;

    await expect(
      runBoundedApiBatch(
        [1, 2, 3],
        async (item) => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          await Promise.resolve();
          completed.push(item);
          active -= 1;
          if (item === 2) throw new Error("failed item");
          return item * 2;
        },
        2,
      ),
    ).rejects.toThrow("failed item");

    expect(completed.sort()).toEqual([1, 2, 3]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});
