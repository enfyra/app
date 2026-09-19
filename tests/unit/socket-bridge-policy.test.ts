import { describe, expect, it } from "vitest";
import {
  SocketBridgeBuffer,
  isSocketBridgeOriginAllowed,
} from "../../server/utils/socket-bridge-policy";

describe("socket bridge policy", () => {
  it("defaults deny when the CORS allowlist is unavailable", () => {
    expect(
      isSocketBridgeOriginAllowed("https://app.example.com", {
        loaded: false,
        origins: [],
      }),
    ).toBe(false);
  });

  it("supports the loaded empty allow-all contract", () => {
    expect(
      isSocketBridgeOriginAllowed("https://app.example.com", {
        loaded: true,
        origins: [],
      }),
    ).toBe(true);
    expect(
      isSocketBridgeOriginAllowed("https://evil.example.com", {
        loaded: true,
        origins: ["https://app.example.com"],
      }),
    ).toBe(false);
    expect(
      isSocketBridgeOriginAllowed("https://app.example.com", {
        loaded: true,
        origins: ["https://app.example.com"],
      }),
    ).toBe(true);
  });

  it("accepts non-browser clients without an Origin header", () => {
    expect(
      isSocketBridgeOriginAllowed(undefined, {
        loaded: false,
        origins: [],
      }),
    ).toBe(true);
  });

  it("enforces both message and byte limits", () => {
    const buffer = new SocketBridgeBuffer(2, 4);

    expect(buffer.push("ab")).toBe(true);
    expect(buffer.push(Buffer.from("cd"))).toBe(true);
    expect(buffer.push("e")).toBe(false);
    expect(buffer.drain()).toEqual(["ab", Buffer.from("cd")]);
    expect(buffer.push("12345")).toBe(false);
  });
});
