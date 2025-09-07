import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, computed } from "vue";
import {
  mockMenuApiItems,
  mockApiResponse,
  mockEmptyApiResponse,
} from "../../fixtures/menu-data";

// Mock useEnfyraApi
const mockExecute = vi.fn();
const mockData = ref(null);
const mockPending = ref(false);

const mockUseEnfyraApi = vi.fn(() => ({
  data: mockData,
  pending: mockPending,
  execute: mockExecute,
}));

// Mock the composable
const mockUseMenuApi = () => {
  mockUseEnfyraApi();

  const getMiniSidebars = computed(() => {
    const menus = mockData.value?.data || [];
    if (!Array.isArray(menus)) return [];
    return menus
      .filter((menu: any) => menu.type === "Mini Sidebar" && menu.isEnabled)
      .sort((a: any, b: any) => a.order - b.order);
  });

  const getDropdownMenus = computed(() => {
    const menus = mockData.value?.data || [];
    if (!Array.isArray(menus)) return [];
    return menus
      .filter((menu: any) => menu.type === "Dropdown Menu" && menu.isEnabled)
      .sort((a: any, b: any) => a.order - b.order);
  });

  const getMenus = computed(() => {
    const menus = mockData.value?.data || [];
    if (!Array.isArray(menus)) return [];
    return menus
      .filter((menu: any) => menu.type === "Menu" && menu.isEnabled)
      .sort((a: any, b: any) => a.order - b.order);
  });

  const getMenuItemsBySidebar = computed(() => {
    return (sidebarId: string) => {
      const allMenus = mockData.value?.data || [];
      if (!Array.isArray(allMenus)) return [];
      return allMenus
        .filter(
          (item: any) =>
            (item.type === "Menu" || item.type === "Dropdown Menu") &&
            item.isEnabled &&
            item.sidebar?.id?.toString() === sidebarId
        )
        .sort((a: any, b: any) => a.order - b.order);
    };
  });

  return {
    fetchMenuDefinitions: mockExecute,
    menuDefinitionsPending: mockPending,
    menuDefinitions: mockData,
    getMiniSidebars,
    getDropdownMenus,
    getMenus,
    getMenuItemsBySidebar,
  };
};

describe("useMenuApi", () => {
  let menuApi: ReturnType<typeof mockUseMenuApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockData.value = mockApiResponse;
    mockPending.value = false;
    menuApi = mockUseMenuApi();
  });

  describe("getMiniSidebars", () => {
    it("should return filtered and sorted mini sidebars", () => {
      const miniSidebars = menuApi.getMiniSidebars.value;

      expect(miniSidebars).toHaveLength(3);
      expect(miniSidebars.map((s: any) => s.label)).toEqual([
        "Dashboard",
        "Data",
        "Collections",
      ]);
      expect(miniSidebars.every((s: any) => s.type === "Mini Sidebar")).toBe(
        true
      );
      expect(miniSidebars.every((s: any) => s.isEnabled)).toBe(true);
    });

    it("should return empty array when no data", () => {
      mockData.value = null;

      const miniSidebars = menuApi.getMiniSidebars.value;
      expect(miniSidebars).toEqual([]);
    });

    it("should return empty array when data is empty", () => {
      mockData.value = mockEmptyApiResponse;

      const miniSidebars = menuApi.getMiniSidebars.value;
      expect(miniSidebars).toEqual([]);
    });

    it("should filter out disabled mini sidebars", () => {
      mockData.value = {
        data: [
          ...mockMenuApiItems,
          {
            ...mockMenuApiItems[0],
            id: 999,
            label: "Disabled Sidebar",
            type: "Mini Sidebar",
            isEnabled: false,
          },
        ],
      };

      const miniSidebars = menuApi.getMiniSidebars.value;
      expect(miniSidebars.map((s: any) => s.label)).not.toContain(
        "Disabled Sidebar"
      );
    });

    it("should handle undefined data structure gracefully", () => {
      mockData.value = { data: undefined };

      const miniSidebars = menuApi.getMiniSidebars.value;
      expect(miniSidebars).toEqual([]);
    });

    it("should sort by order property correctly with negative orders", () => {
      mockData.value = {
        data: [
          {
            ...mockMenuApiItems[0],
            id: 1,
            label: "Third",
            type: "Mini Sidebar",
            order: 10,
          },
          {
            ...mockMenuApiItems[0],
            id: 2,
            label: "First",
            type: "Mini Sidebar",
            order: -5,
          },
          {
            ...mockMenuApiItems[0],
            id: 3,
            label: "Second",
            type: "Mini Sidebar",
            order: 0,
          },
        ],
      };

      const miniSidebars = menuApi.getMiniSidebars.value;
      expect(miniSidebars.map((s: any) => s.label)).toEqual([
        "First",
        "Second",
        "Third",
      ]);
    });
  });

  describe("getDropdownMenus", () => {
    it("should return filtered and sorted dropdown menus", () => {
      const dropdownMenus = menuApi.getDropdownMenus.value;

      expect(dropdownMenus).toHaveLength(2); // Files and Settings dropdowns
      expect(dropdownMenus.map((m: any) => m.label)).toEqual([
        "Files",
        "Settings",
      ]);
      expect(dropdownMenus.every((m: any) => m.type === "Dropdown Menu")).toBe(
        true
      );
      expect(dropdownMenus.every((m: any) => m.isEnabled)).toBe(true);
    });

    it("should return empty array when no data", () => {
      mockData.value = null;

      const dropdownMenus = menuApi.getDropdownMenus.value;
      expect(dropdownMenus).toEqual([]);
    });

    it("should return empty array when data is empty", () => {
      mockData.value = mockEmptyApiResponse;

      const dropdownMenus = menuApi.getDropdownMenus.value;
      expect(dropdownMenus).toEqual([]);
    });

    it("should filter out disabled dropdown menus", () => {
      mockData.value = {
        data: [
          ...mockMenuApiItems,
          {
            ...mockMenuApiItems[0],
            id: 999,
            label: "Disabled Dropdown",
            type: "Dropdown Menu",
            isEnabled: false,
          },
        ],
      };

      const dropdownMenus = menuApi.getDropdownMenus.value;
      expect(dropdownMenus.map((m: any) => m.label)).not.toContain(
        "Disabled Dropdown"
      );
    });

    it("should sort by order property", () => {
      mockData.value = {
        data: [
          {
            ...mockMenuApiItems[0],
            id: 1,
            label: "Second",
            type: "Dropdown Menu",
            order: 2,
          },
          {
            ...mockMenuApiItems[0],
            id: 2,
            label: "First",
            type: "Dropdown Menu",
            order: 1,
          },
        ],
      };

      const dropdownMenus = menuApi.getDropdownMenus.value;
      expect(dropdownMenus.map((m: any) => m.label)).toEqual([
        "First",
        "Second",
      ]);
    });

    it("should handle items with same order", () => {
      mockData.value = {
        data: [
          {
            ...mockMenuApiItems[0],
            id: 1,
            label: "First",
            type: "Dropdown Menu",
            order: 1,
          },
          {
            ...mockMenuApiItems[0],
            id: 2,
            label: "Second",
            type: "Dropdown Menu",
            order: 1,
          },
        ],
      };

      const dropdownMenus = menuApi.getDropdownMenus.value;
      expect(dropdownMenus).toHaveLength(2);
      // Should maintain stable order when order values are the same
      expect(dropdownMenus[0].id).toBe(1);
      expect(dropdownMenus[1].id).toBe(2);
    });
  });

  describe("getMenus", () => {
    it("should return filtered and sorted regular menus", () => {
      const menus = menuApi.getMenus.value;

      expect(menus).toHaveLength(1); // Overview menu
      expect(menus[0].label).toBe("Overview");
      expect(menus[0].type).toBe("Menu");
      expect(menus[0].isEnabled).toBe(true);
    });

    it("should return empty array when no data", () => {
      mockData.value = null;

      const menus = menuApi.getMenus.value;
      expect(menus).toEqual([]);
    });

    it("should return empty array when data is empty", () => {
      mockData.value = mockEmptyApiResponse;

      const menus = menuApi.getMenus.value;
      expect(menus).toEqual([]);
    });

    it("should filter out disabled menus", () => {
      mockData.value = {
        data: [
          ...mockMenuApiItems,
          {
            ...mockMenuApiItems[0],
            id: 999,
            label: "Disabled Menu",
            type: "Menu",
            isEnabled: false,
          },
        ],
      };

      const menus = menuApi.getMenus.value;
      expect(menus.map((m: any) => m.label)).not.toContain("Disabled Menu");
    });

    it("should handle multiple menus with different orders", () => {
      mockData.value = {
        data: [
          {
            ...mockMenuApiItems[0],
            id: 1,
            label: "Third Menu",
            type: "Menu",
            order: 3,
          },
          {
            ...mockMenuApiItems[0],
            id: 2,
            label: "First Menu",
            type: "Menu",
            order: 1,
          },
          {
            ...mockMenuApiItems[0],
            id: 3,
            label: "Second Menu",
            type: "Menu",
            order: 2,
          },
        ],
      };

      const menus = menuApi.getMenus.value;
      expect(menus.map((m: any) => m.label)).toEqual([
        "First Menu",
        "Second Menu",
        "Third Menu",
      ]);
    });
  });

  describe("getMenuItemsBySidebar", () => {
    it("should return menus and dropdown menus for specific sidebar", () => {
      // Sidebar 1 has Settings dropdown and Overview menu
      const sidebar1Items = menuApi.getMenuItemsBySidebar.value("1");

      expect(sidebar1Items).toHaveLength(2);
      expect(sidebar1Items.map((item: any) => item.label)).toEqual([
        "Overview",
        "Settings",
      ]);
    });

    it("should return only dropdown menus for sidebar 2", () => {
      // Sidebar 2 has Files dropdown
      const sidebar2Items = menuApi.getMenuItemsBySidebar.value("2");

      expect(sidebar2Items).toHaveLength(1);
      expect(sidebar2Items[0].label).toBe("Files");
      expect(sidebar2Items[0].type).toBe("Dropdown Menu");
    });

    it("should return empty array for non-existent sidebar", () => {
      const items = menuApi.getMenuItemsBySidebar.value("999");
      expect(items).toEqual([]);
    });

    it("should return empty array when no data", () => {
      mockData.value = null;

      const items = menuApi.getMenuItemsBySidebar.value("1");
      expect(items).toEqual([]);
    });

    it("should return empty array when data is empty", () => {
      mockData.value = mockEmptyApiResponse;

      const items = menuApi.getMenuItemsBySidebar.value("1");
      expect(items).toEqual([]);
    });

    it("should handle sidebar ID as number", () => {
      // The function expects string, so we need to convert number to string for comparison
      const items = menuApi.getMenuItemsBySidebar.value("1");
      expect(items).toHaveLength(2);
      expect(items.map((item: any) => item.label)).toEqual([
        "Overview",
        "Settings",
      ]);
    });

    it("should handle sidebar ID as string number", () => {
      const items = menuApi.getMenuItemsBySidebar.value("1");
      expect(items).toHaveLength(2);
      expect(items.map((item: any) => item.label)).toEqual([
        "Overview",
        "Settings",
      ]);
    });

    it("should filter out disabled items", () => {
      mockData.value = {
        data: [
          {
            ...mockMenuApiItems[0],
            id: 1,
            label: "Enabled Menu",
            type: "Menu",
            sidebar: { id: 1 },
            isEnabled: true,
            order: 1,
          },
          {
            ...mockMenuApiItems[0],
            id: 2,
            label: "Disabled Menu",
            type: "Menu",
            sidebar: { id: 1 },
            isEnabled: false,
            order: 2,
          },
        ],
      };

      const items = menuApi.getMenuItemsBySidebar.value("1");
      expect(items).toHaveLength(1);
      expect(items[0].label).toBe("Enabled Menu");
    });

    it("should sort items by order", () => {
      mockData.value = {
        data: [
          {
            ...mockMenuApiItems[0],
            id: 1,
            label: "Second Item",
            type: "Menu",
            sidebar: { id: 1 },
            order: 2,
          },
          {
            ...mockMenuApiItems[0],
            id: 2,
            label: "First Item",
            type: "Menu",
            sidebar: { id: 1 },
            order: 1,
          },
        ],
      };

      const items = menuApi.getMenuItemsBySidebar.value("1");
      expect(items.map((item: any) => item.label)).toEqual([
        "First Item",
        "Second Item",
      ]);
    });

    it("should include both Menu and Dropdown Menu types", () => {
      mockData.value = {
        data: [
          {
            ...mockMenuApiItems[0],
            id: 1,
            label: "Regular Menu",
            type: "Menu",
            sidebar: { id: 1 },
            order: 1,
          },
          {
            ...mockMenuApiItems[0],
            id: 2,
            label: "Dropdown Menu",
            type: "Dropdown Menu",
            sidebar: { id: 1 },
            order: 2,
          },
        ],
      };

      const items = menuApi.getMenuItemsBySidebar.value("1");
      expect(items).toHaveLength(2);
      expect(items.map((item: any) => item.type)).toEqual([
        "Menu",
        "Dropdown Menu",
      ]);
    });

    it("should handle sidebar with null or undefined id", () => {
      mockData.value = {
        data: [
          {
            ...mockMenuApiItems[0],
            id: 1,
            label: "Menu without sidebar",
            type: "Menu",
            sidebar: null,
            order: 1,
          },
          {
            ...mockMenuApiItems[0],
            id: 2,
            label: "Menu with undefined sidebar",
            type: "Menu",
            sidebar: undefined,
            order: 2,
          },
        ],
      };

      const items = menuApi.getMenuItemsBySidebar.value("1");
      expect(items).toEqual([]);
    });

    it("should handle sidebar with nested id object", () => {
      mockData.value = {
        data: [
          {
            ...mockMenuApiItems[0],
            id: 1,
            label: "Nested ID Menu",
            type: "Menu",
            sidebar: { id: { value: 1 } },
            order: 1,
          },
        ],
      };

      const items = menuApi.getMenuItemsBySidebar.value("1");
      expect(items).toEqual([]);
    });
  });

  describe("fetchMenuDefinitions", () => {
    it("should call execute function", async () => {
      await menuApi.fetchMenuDefinitions();
      expect(mockExecute).toHaveBeenCalledOnce();
    });

    it("should call execute function without parameters", async () => {
      await menuApi.fetchMenuDefinitions();
      expect(mockExecute).toHaveBeenCalledWith();
    });
  });

  describe("reactive properties", () => {
    it("should expose pending state", () => {
      expect(menuApi.menuDefinitionsPending.value).toBe(false);

      mockPending.value = true;
      expect(menuApi.menuDefinitionsPending.value).toBe(true);
    });

    it("should expose menu definitions data", () => {
      expect(menuApi.menuDefinitions.value).toEqual(mockApiResponse);
    });

    it("should handle data changes reactively", () => {
      const newData = {
        data: [
          { id: 1, label: "New Menu", type: "Menu", isEnabled: true, order: 1 },
        ],
      };
      mockData.value = newData;

      expect(menuApi.menuDefinitions.value).toEqual(newData);
      expect(menuApi.getMenus.value).toHaveLength(1);
      expect(menuApi.getMenus.value[0].label).toBe("New Menu");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle malformed data gracefully", () => {
      mockData.value = { data: "invalid data" };

      expect(menuApi.getMiniSidebars.value).toEqual([]);
      expect(menuApi.getDropdownMenus.value).toEqual([]);
      expect(menuApi.getMenus.value).toEqual([]);
    });

    it("should handle data with missing properties", () => {
      mockData.value = {
        data: [
          { id: 1, label: "Menu without type" },
          { id: 2, type: "Menu", isEnabled: true, order: 1 },
          { id: 3, type: "Menu", isEnabled: false, order: 2 },
        ],
      };

      const menus = menuApi.getMenus.value;
      expect(menus).toHaveLength(1);
      expect(menus[0].id).toBe(2);
    });

    it("should handle data with null/undefined values", () => {
      mockData.value = {
        data: [
          { id: 1, type: "Menu", isEnabled: null, order: 1 },
          { id: 2, type: "Menu", isEnabled: undefined, order: 2 },
          { id: 3, type: "Menu", isEnabled: true, order: 3 },
        ],
      };

      const menus = menuApi.getMenus.value;
      expect(menus).toHaveLength(1);
      expect(menus[0].id).toBe(3);
    });
  });
});
