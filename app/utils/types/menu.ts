import type { PermissionCondition } from "./permissions";

export interface MenuDefinition {
  id?: number; 
  _id?: string; 
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

export interface MenuItem {
  id: string;
  label: string;
  route: string;
  icon?: string;
  
  position?: "top" | "bottom";
  sidebarId?: number | string; 
  permission?: PermissionCondition;
  
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
  
  onClick?: () => void | Promise<void>;
  class?: string;
  
  component?: string | any;
  componentProps?: Record<string, any>;
  key?: string;
}

export interface MenuApiItem {
  id?: number; 
  _id?: string; 
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
