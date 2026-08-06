import type { PermissionCondition } from "./permissions";
import type { ExtensionDefinition } from "./extensions";

export interface MenuPermission {
  id?: number | string;
  _id?: string;
  isEnabled: boolean;
  role?: { id?: number | string; _id?: string; name?: string } | null;
}

export interface MenuDefinition {
  id?: number;
  _id?: string;
  description: string;
  icon: string;
  isEnabled: boolean;
  isSystem: boolean;
  isPublic?: boolean;
  label: string;
  order: number;
  path: string;
  permission: PermissionCondition | null;
  menuPermissions?: MenuPermission[];
  type: "Dropdown Menu" | "Menu";
  parent: number | string | { id: number | string } | null;
  sidebar: { id?: number; _id?: string } | null;
  children?: MenuDefinition[];
  menus: MenuDefinition[];
  extension?: ExtensionDefinition;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuTreeItem extends Omit<MenuDefinition, 'children' | 'id'> {
  id: string;
  isDropdown: boolean;
  children: MenuTreeItem[];
}

export interface MenuItem {
  id: string;
  label: string;
  route: string;
  icon?: string;
  position?: "top" | "bottom";
  sidebarId?: number | string;
  permission?: PermissionCondition;
  path?: string;
  children?: MenuItem[];
  order?: number;
  type?: "Dropdown Menu" | "Menu";
  parent?: MenuDefinition | MenuItem | null;
  sidebar?: { id?: number; _id?: string } | null;
  description?: string;
  isEnabled?: boolean;
  isSystem?: boolean;
  isPublic?: boolean;
  menuPermissions?: MenuPermission[];
  menus?: MenuItem[];
  extension?: ExtensionDefinition;
  createdAt?: string;
  updatedAt?: string;
  onClick?: () => void | Promise<void>;
  class?: string;
  component?: string | (() => Promise<any>);
  componentProps?: Record<string, unknown>;
  key?: string;
}

export interface MenuApiItem {
  id?: number;
  _id?: string;
  description: string;
  icon: string;
  isEnabled: boolean;
  isSystem: boolean;
  isPublic?: boolean;
  label: string;
  order: number;
  path: string;
  permission: PermissionCondition | null;
  menuPermissions?: MenuPermission[];
  type: "Dropdown Menu" | "Menu";
  parent: number | string | null;
  sidebar: { id?: number; _id?: string } | null;
  children?: MenuApiItem[];
  menus: MenuApiItem[];
  extension?: ExtensionDefinition;
  createdAt?: string;
  updatedAt?: string;
}

export interface DragEventAdded {
  element: MenuTreeItem;
  newIndex: number;
  oldIndex: number;
}

export interface DragEventRemoved {
  element: MenuTreeItem;
  oldIndex: number;
}

export interface DragEvent {
  added?: DragEventAdded;
  removed?: DragEventRemoved;
  moved?: {
    element: MenuTreeItem;
    newIndex: number;
    oldIndex: number;
  };
}
