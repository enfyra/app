import { describe, expect, it, vi } from "vitest";
import {
  evaluatePermissionCondition,
  normalizePermissionCondition,
} from "~/utils/permission-condition";

describe("permission conditions", () => {
  it("fails closed for empty logical groups", () => {
    const checkRule = vi.fn(() => true);

    expect(
      evaluatePermissionCondition({ and: [] }, false, checkRule),
    ).toBe(false);
    expect(
      evaluatePermissionCondition({ or: [] }, false, checkRule),
    ).toBe(false);
    expect(
      evaluatePermissionCondition(
        { and: [{ or: [] }] },
        false,
        checkRule,
      ),
    ).toBe(false);
    expect(checkRule).not.toHaveBeenCalled();
  });

  it("evaluates non-empty route groups", () => {
    const checkRule = vi.fn((rule) => rule.route === "/notes");

    expect(
      evaluatePermissionCondition(
        {
          and: [
            { route: "/notes", methods: ["GET"] },
            { or: [{ route: "/notes", methods: ["PATCH"] }] },
          ],
        },
        false,
        checkRule,
      ),
    ).toBe(true);
  });

  it("removes empty groups before serialization", () => {
    expect(normalizePermissionCondition({ and: [] })).toBeNull();
    expect(
      normalizePermissionCondition({
        and: [
          { or: [] },
          { route: "/notes", methods: ["GET"] },
        ],
      }),
    ).toEqual({
      and: [{ route: "/notes", methods: ["GET"] }],
    });
  });
});
