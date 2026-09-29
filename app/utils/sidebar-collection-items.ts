export function selectSidebarCollections<T extends { to?: string }>(items: T[], maxVisible: number, pinnedTableNames: string[] = []): T[] {
  const pinnedRoutes = new Set(pinnedTableNames.map(name => `/data/${name}`));
  return [
    ...items.filter(item => item.to && pinnedRoutes.has(item.to)),
    ...items.filter(item => !item.to || !pinnedRoutes.has(item.to)),
  ].slice(0, maxVisible);
}
