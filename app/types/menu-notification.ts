export type MenuNotificationColor = "primary" | "success" | "warning" | "error" | "info" | "neutral";

export interface MenuNotificationTarget {
  id?: string | number;
  path?: string;
  route?: string;
}

export interface MenuNotificationRegistration {
  id: string;
  target: MenuNotificationTarget;
  value?: string | number | null;
  color?: MenuNotificationColor;
  title?: string;
  order?: number;
}

export interface ResolvedMenuNotification {
  value?: string | number | null;
  color: MenuNotificationColor;
  title?: string;
  hasChildren?: boolean;
}
