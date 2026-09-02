import { describe, expect, it } from "vitest";
import {
  normalizeColumnOptions,
  parseColumnOptions,
  validateColumnOptions,
} from "../../app/utils/schema/column-options";

describe("column enum options", () => {
  it("parses legacy PostgreSQL-style metadata arrays", () => {
    expect(parseColumnOptions('{"sepay","paypal"}')).toEqual([
      "sepay",
      "paypal",
    ]);
  });

  it("replaces options with a trimmed unique array for enum columns", () => {
    const column = {
      type: "enum",
      options: ["sepay", " paypal ", "apipay", "apipay", ""],
    };

    expect(normalizeColumnOptions(column)).toEqual({
      type: "enum",
      options: ["sepay", "paypal", "apipay"],
    });
  });

  it("removes stale enum options after changing to a scalar type", () => {
    const column = {
      type: "varchar",
      options: ["sepay", "paypal"],
    };

    expect(normalizeColumnOptions(column)).toEqual({ type: "varchar" });
  });

  it("requires at least one option for enum and array-select", () => {
    expect(validateColumnOptions("enum", [])).toBe(
      "At least one option is required",
    );
    expect(validateColumnOptions("array-select", ["ready"])).toBeNull();
    expect(validateColumnOptions("varchar", [])).toBeNull();
  });
});
