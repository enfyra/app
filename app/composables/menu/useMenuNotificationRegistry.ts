import type {
  MenuNotificationRegistration,
  ResolvedMenuNotification,
} from "~/types/menu-notification";

const menuNotificationOwners = new Map<string, number>();

function normalizeRoutePath(path?: string | null): string | null {
  if (!path) return null;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.length > 1 && normalized.endsWith("/")
    ? normalized.slice(0, -1)
    : normalized;
}

function matchesTarget(item: any, target: MenuNotificationRegistration["target"]) {
  const itemId = item?.id == null ? null : String(item.id);
  const targetId = target.id == null ? null : String(target.id);
  if (itemId && targetId && itemId === targetId) return true;

  const itemPaths = new Set([
    normalizeRoutePath(item?.route),
    normalizeRoutePath(item?.path),
    normalizeRoutePath(item?.to),
  ].filter(Boolean));
  const targetPaths = [
    normalizeRoutePath(target.path),
    normalizeRoutePath(target.route),
  ].filter(Boolean);

  return targetPaths.some((path) => itemPaths.has(path));
}

export function useMenuNotificationRegistry() {
  const notifications = useState<MenuNotificationRegistration[]>(
    "menu-notifications",
    () => []
  );

  const registerOne = (notification: MenuNotificationRegistration, ownerUid?: number) => {
    const existingIndex = notifications.value.findIndex((item) => item.id === notification.id);
    if (existingIndex > -1) {
      notifications.value[existingIndex] = notification;
    } else {
      notifications.value.push(notification);
    }
    if (ownerUid !== undefined) {
      menuNotificationOwners.set(notification.id, ownerUid);
    }
  };

  const unregister = (id: string) => {
    const index = notifications.value.findIndex((item) => item.id === id);
    if (index > -1) notifications.value.splice(index, 1);
    menuNotificationOwners.delete(id);
  };

  const register = (nextNotifications: MenuNotificationRegistration | MenuNotificationRegistration[]) => {
    const ownerUid = getCurrentInstance()?.uid;
    const normalized = Array.isArray(nextNotifications) ? nextNotifications : [nextNotifications];
    normalized.forEach((notification) => registerOne(notification, ownerUid));

    if (ownerUid !== undefined) {
      onUnmounted(() => {
        normalized.forEach((notification) => {
          if (menuNotificationOwners.get(notification.id) === ownerUid) {
            unregister(notification.id);
          }
        });
      });
    }
  };

  const clear = () => {
    notifications.value = [];
    menuNotificationOwners.clear();
  };

  const getMenuNotification = (item: any): ResolvedMenuNotification | null => {
    const direct = notifications.value
      .filter((notification) => matchesTarget(item, notification.target))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];

    if (direct) {
      return {
        value: direct.value,
        color: direct.color ?? "primary",
        title: direct.title,
      };
    }

    const childNotifications = (item?.children ?? [])
      .map((child: any) => getMenuNotification(child))
      .filter(Boolean) as ResolvedMenuNotification[];

    if (childNotifications.length === 0) return null;

    const numericTotal = childNotifications.reduce((total, notification) => {
      const value = Number(notification.value);
      return Number.isFinite(value) ? total + value : total;
    }, 0);

    return {
      value: numericTotal > 0 ? numericTotal : null,
      color: childNotifications[0]?.color ?? "primary",
      hasChildren: true,
    };
  };

  return {
    notifications: readonly(notifications),
    register,
    unregister,
    clear,
    getMenuNotification,
  };
}
