import type { PermissionCondition } from "./permissions";

// API Response Interface from /menu_definition endpoint
export interface MenuDefinition {
  id?: number; // SQL databases
  _id?: string; // MongoDB
  description: string;
  icon: string;
  isEnabled: boolean;
  isSystem: boolean;
  label: string;
  order: number;
  path: string;
  permission: PermissionCondition | null;
  type: "Dropdown Menu" | "Menu";
  parent: number | string | null;
  sidebar: { id?: number; _id?: string } | null;
  children: any[];
  menus: any[];
  createdAt?: string;
  updatedAt?: string;
}

// Internal Interface for Menu Items in useMenuRegistry
export interface MenuItem {
  id: string;
  label: string;
  route: string;
  icon?: string;
  sidebarId?: number | string; // Support both SQL (number) and MongoDB (string) - optional for special items like logout
  permission?: PermissionCondition;
  // Additional fields from API for full compatibility
  path?: string;
  children?: any[];
  order?: number;
  type?: "Dropdown Menu" | "Menu";
  parent?: any;
  sidebar?: any;
  description?: string;
  isEnabled?: boolean;
  isSystem?: boolean;
  menus?: any[];
  extension?: any;
  createdAt?: string;
  updatedAt?: string;
  // Optional handlers for special items (e.g., logout button)
  onClick?: () => void | Promise<void>;
  class?: string;
}

// API Response Interface from useMenuApi (different from MenuDefinition)
export interface MenuApiItem {
  id?: number; // SQL databases
  _id?: string; // MongoDB
  description: string;
  icon: string;
  isEnabled: boolean;
  isSystem: boolean;
  label: string;
  order: number;
  path: string;
  permission: any;
  type: "Dropdown Menu" | "Menu";
  parent: number | string | null;
  sidebar: { id?: number; _id?: string } | null;
  children: any[];
  menus: any[];
  extension?: any;
  createdAt?: string;
  updatedAt?: string;
}
