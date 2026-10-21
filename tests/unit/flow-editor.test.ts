import { describe, expect, it } from "vitest";
import {
  buildFlowExecutionDetailFilter,
  resolveRouteIdentifier,
  validateConditionSource,
} from "~/utils/flow-editor";

describe("flow editor helpers", () => {
  it("reactively resolves the active route identifier", () => {
    expect(resolveRouteIdentifier(["flow-2", "ignored"])).toBe("flow-2");
    expect(resolveRouteIdentifier("flow-3")).toBe("flow-3");
  });

  it("scopes execution detail to the current flow", () => {
    expect(
      buildFlowExecutionDetailFilter("flow-1", "exec-1", "id"),
    ).toEqual({
      _and: [
        { id: { _eq: "exec-1" } },
        { flow: { _eq: "flow-1" } },
      ],
    });
  });
});

describe("validateConditionSource", () => {
  it("requires source code", () => {
    expect(validateConditionSource("")).toContain("need source code");
    expect(validateConditionSource("   ")).toContain("need source code");
    expect(validateConditionSource(null)).toContain("need source code");
  });

  it("requires a return statement", () => {
    expect(validateConditionSource("const ok = true;")).toContain("must return");
  });

  it("rejects a bare return", () => {
    expect(validateConditionSource("return;")).toContain("not a bare return");
  });

  it("rejects unambiguous non-boolean returns", () => {
    expect(validateConditionSource("return { ok: true };")).toContain("must return a boolean");
    expect(validateConditionSource("return [];")).toContain("must return a boolean");
    expect(validateConditionSource("return null;")).toContain("must return a boolean");
    expect(validateConditionSource("return 'yes';")).toContain("must return a boolean");
    expect(validateConditionSource("return `yes`;")).toContain("must return a boolean");
  });

  it("accepts boolean expressions and wrapped values", () => {
    expect(validateConditionSource("return true;")).toBeNull();
    expect(validateConditionSource("return count > 0;")).toBeNull();
    expect(validateConditionSource("return 0 > 1;")).toBeNull();
    expect(validateConditionSource("return Boolean(@FLOW_PAYLOAD.enabled);")).toBeNull();
    expect(validateConditionSource("const rows = await #todo.find({ limit: 1 });\nreturn rows.data.length > 0;")).toBeNull();
  });

  it("ignores non-boolean returns inside comments", () => {
    expect(validateConditionSource("// return {}\nreturn true;")).toBeNull();
    expect(validateConditionSource("/* return []; */\nreturn false;")).toBeNull();
  });
});
