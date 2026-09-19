import { describe, expect, it } from "vitest";
import { buildProfileUpdatePayload } from "~/utils/profile-update";

describe("profile update payload", () => {
  it("sends only changed self-service fields", () => {
    expect(
      buildProfileUpdatePayload(
        {
          id: "user-1",
          email: "owner@example.com",
          displayName: "Updated",
          locale: "vi",
          roles: [{ id: "admin" }],
          isRootAdmin: true,
        },
        {
          id: "user-1",
          email: "owner@example.com",
          displayName: "Original",
          locale: "vi",
          roles: [{ id: "member" }],
          isRootAdmin: false,
        },
      ),
    ).toEqual({ displayName: "Updated" });
  });

  it("keeps changed custom relation values", () => {
    expect(
      buildProfileUpdatePayload(
        { team: { id: "team-2" } },
        { team: { id: "team-1" } },
      ),
    ).toEqual({ team: { id: "team-2" } });
  });
});
