export interface MenuRouteMatch<TItem = unknown> {
  item: TItem;
  path: string;
  params: Record<string, string>;
  score: number;
  isExact: boolean;
}
