import type { ComputedRef, Ref } from "vue";
import type { PermissionCondition } from "./permissions";

export interface DataTableProps {
  data: any[];
  columns: any[]; 
  pageSize?: number;
  loading?: boolean;
  selectable?: boolean;
  contextMenuItems?: (row: any) => any[];
  selectedItems?: string[];
}

export interface ColumnSelectorProps {
  items: Array<{
    label: string;
    type: "checkbox";
    checked: boolean;
    onSelect: (e: Event) => void;
  }>;
}

export interface BulkActionsProps {
  selectedCount: number;
  onDelete?: () => void;
}

export interface UploadModalProps {
  modelValue: boolean;
  title?: string;
  accept?: string | string[];
  multiple?: boolean;
  maxSize?: number; 
  dragText?: string;
  acceptText?: string;
  uploadText?: string;
  uploadingText?: string;
  loading?: boolean; 
}

export interface UploadModalEmits {
  "update:modelValue": [value: boolean];
  upload: [files: File | File[]];
  error: [message: string];
}

export interface LoadingProps {
  show?: boolean;
  message?: string;
}

export interface GlobalLoadingProps {
  show: boolean;
  title?: string;
  description?: string;
}

export interface RouteLoadingProps {
  show?: boolean;
  message?: string;
}

export interface PermissionGateProps {
  
  actions?: string[];
  routes?: string[];
  mode?: "any" | "all";
  
  condition?: PermissionCondition;
}

export interface HeaderAction {
  id: string;
  label?: string | ComputedRef<string>;
  icon?: string | ComputedRef<string>;
  variant?:
    | "solid"
    | "outline"
    | "ghost"
    | "soft"
    | ComputedRef<"solid" | "outline" | "ghost" | "soft">;
  color?:
    | "primary"
    | "secondary"
    | "warning"
    | "success"
    | "info"
    | "error"
    | "neutral"
    | ComputedRef<
        | "primary"
        | "secondary"
        | "warning"
        | "success"
        | "info"
        | "error"
        | "neutral"
      >;
  size?: "sm" | "md" | "lg" | "xl";
  loading?:
    | boolean
    | Ref<boolean>
    | Readonly<Ref<boolean>>
    | ComputedRef<boolean>;
  disabled?:
    | boolean
    | Ref<boolean>
    | Readonly<Ref<boolean>>
    | ComputedRef<boolean>;
  permission?: PermissionCondition;
  onClick?: () => void;
  to?: string | Ref<string> | Readonly<Ref<string>> | ComputedRef<string>;
  replace?:
    | boolean
    | Ref<boolean>
    | Readonly<Ref<boolean>>
    | ComputedRef<boolean>;
  submit?: () => void;
  showOn?: string[];
  hideOn?: string[];
  class?: string;
  
  component?: string | any; 
  props?: Record<string, any>;
  key?: string; 
  side?: "left" | "right"; 
  global?: boolean; 
  show?: boolean | Ref<boolean> | Readonly<Ref<boolean>> | ComputedRef<boolean>; 
  order?: number; 
}

export interface SettingsCardStat {
  label: string;
  value?: string | number;
  component?: any;
  props?: Record<string, any>;
}

export interface SettingsCardAction {
  label: string;
  props?: Record<string, any>;
  to?: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
}

export interface SettingsCardHeaderAction {
  component?: string; 
  props?: Record<string, any>; 
  label?: string; 
  onClick?: (e?: Event) => void; 
  onUpdate?: (value: any) => void; 
}

export interface SettingsCardProps {
  title: string;
  description?: string;
  icon: string;
  iconColor?: "primary" | "success" | "warning" | "error" | "neutral";
  stats?: SettingsCardStat[];
  actions?: SettingsCardAction[];
  headerActions?: SettingsCardHeaderAction[];
  cardClass?: string;
}
