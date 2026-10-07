import type { DefaultPageMenu } from '~/types/default-page';

export function defaultPageId(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  return defaultPageId(record.id ?? record._id);
}

export function isDefaultPageCandidate(menu: DefaultPageMenu): boolean {
  const path = menu.path || menu.route;
  return menu.type === 'Menu' && menu.isEnabled === true && typeof path === 'string'
    && path.startsWith('/') && !path.startsWith('//') && path !== '/' && path !== '/login'
    && !/[:*?#\[\]\\\s]/.test(path);
}

export function resolveDefaultPage(
  selected: unknown,
  menus: DefaultPageMenu[],
  canSee: (menu: DefaultPageMenu) => boolean,
): string | null {
  const id = defaultPageId(selected);
  if (!id) return null;
  const menu = menus.find(item => defaultPageId(item) === id);
  return menu && isDefaultPageCandidate(menu) && canSee(menu) ? menu.path || menu.route || null : null;
}

export function isDefaultPageAncestor(menu: unknown, selected: unknown, menus: DefaultPageMenu[]): boolean {
  const target = defaultPageId(menu);
  let cursor = defaultPageId(selected);
  const visited = new Set<string>();
  while (cursor && !visited.has(cursor)) {
    if (cursor === target) return true;
    visited.add(cursor);
    cursor = defaultPageId(menus.find(item => defaultPageId(item) === cursor)?.parent);
  }
  return false;
}
