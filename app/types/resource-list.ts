export type ResourceListColor = "primary" | "secondary" | "success" | "info" | "warning" | "error" | "neutral";

export interface ResourceListStat {
  label: string;
  value?: string | number;
  values?: Array<{ value: string | number; props?: Record<string, any> }>;
  component?: string | any;
  props?: Record<string, any>;
}

export interface ResourceListAction {
  label: string;
  props?: Record<string, any>;
  to?: string;
  onClick?: (event?: Event) => void;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
}

export interface ResourceListHeaderAction {
  component?: string;
  props?: Record<string, any>;
  label?: string;
  onClick?: (event?: Event) => void;
  onUpdate?: (value: any) => void;
}

export interface ResourceListTopBadge {
  label: string;
  color?: ResourceListColor;
}
