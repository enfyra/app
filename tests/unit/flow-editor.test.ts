import { describe, expect, it } from "vitest";
import {
  buildFlowExecutionDetailFilter,
  resolveRouteIdentifier,
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
