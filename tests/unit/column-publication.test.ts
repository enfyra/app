import { describe, expect, it } from "vitest";
import { normalizeColumnPublication } from "../../app/utils/schema/column-publication";

describe("normalizeColumnPublication", () => {
  it("forces unpublished columns to remain nullable", () => {
    const column = { isPublished: false, isNullable: false };

    expect(normalizeColumnPublication(column)).toEqual({
      isPublished: false,
      isNullable: true,
    });
  });

  it("does not change nullable state for published columns", () => {
    const column = { isPublished: true, isNullable: false };

    expect(normalizeColumnPublication(column)).toEqual({
      isPublished: true,
      isNullable: false,
    });
  });

  it("preserves the same reactive object", () => {
    const column = { isPublished: false, isNullable: false };

    expect(normalizeColumnPublication(column)).toBe(column);
  });
});
