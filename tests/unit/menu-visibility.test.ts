import { describe, expect, it } from "vitest";
import { canSeeMenu } from "~/utils/menu-visibility";

describe("menu visibility", () => {
  it("shows public menus to every role", () => {
    expect(canSeeMenu({ isPublic: true }, null)).toBe(true);
  });

  it("requires an enabled role rule for private menus", () => {
    const menu = {
      isPublic: false,
      menuPermissions: [
        { isEnabled: true, role: { id: 7 } },
        { isEnabled: false, role: { id: 8 } },
      ],
    };

    expect(canSeeMenu(menu, 7)).toBe(true);
    expect(canSeeMenu(menu, 8)).toBe(false);
    expect(canSeeMenu(menu, 9)).toBe(false);
  });

  it("hides menus without an explicit public flag or role rule", () => {
    expect(canSeeMenu({}, 9)).toBe(false);
  });

  it("lets root admins see a disabled role restriction but not a disabled menu", () => {
    expect(canSeeMenu({ isPublic: false, menuPermissions: [] }, null, true)).toBe(true);
    expect(canSeeMenu({ isEnabled: false, isPublic: true }, null, true)).toBe(false);
  });
});
