interface OrderedMenuLike {
  order?: number | null;
  label?: string | null;
  path?: string | null;
  route?: string | null;
  id?: unknown;
}

export function compareMenuOrder(a: OrderedMenuLike, b: OrderedMenuLike) {
  const orderDiff = (a.order || 0) - (b.order || 0);
  if (orderDiff !== 0) return orderDiff;

  const labelDiff = String(a.label || '').localeCompare(String(b.label || ''));
  if (labelDiff !== 0) return labelDiff;

  const aPath = String(a.route || a.path || '');
  const bPath = String(b.route || b.path || '');
  const pathDiff = aPath.localeCompare(bPath);
  if (pathDiff !== 0) return pathDiff;

  return String(a.id || '').localeCompare(String(b.id || ''));
}

export function sortMenuItems<T extends OrderedMenuLike>(items: T[]): T[] {
  return [...items].sort(compareMenuOrder);
}
