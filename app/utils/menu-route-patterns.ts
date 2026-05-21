import type { MenuRouteMatch } from '~/types/menu-route';

export function normalizeMenuRoutePath(path?: string): string {
  if (!path) return "";
  const clean = path.split("?")[0]?.split("#")[0] || "";
  const withSlash = clean.startsWith("/") ? clean : `/${clean}`;
  return withSlash.length > 1 && withSlash.endsWith("/") ? withSlash.slice(0, -1) : withSlash;
}

export function isDynamicMenuPath(path?: string): boolean {
  return normalizeMenuRoutePath(path)
    .split("/")
    .some((segment) => segment.startsWith(":") || segment === "*");
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function matchMenuRoutePath(pattern?: string, target?: string): Omit<MenuRouteMatch, "item" | "path"> | null {
  const normalizedPattern = normalizeMenuRoutePath(pattern);
  const normalizedTarget = normalizeMenuRoutePath(target);

  if (!normalizedPattern || !normalizedTarget) return null;
  if (normalizedPattern === normalizedTarget) {
    return {
      params: {},
      score: 10000 + normalizedPattern.length,
      isExact: true,
    };
  }

  const patternSegments = normalizedPattern.split("/").filter(Boolean);
  const targetSegments = normalizedTarget.split("/").filter(Boolean);
  const wildcardIndex = patternSegments.findIndex((segment) => segment === "*" || segment.endsWith("*"));

  if (wildcardIndex === -1 && patternSegments.length !== targetSegments.length) return null;
  if (wildcardIndex !== -1 && targetSegments.length < wildcardIndex) return null;

  const params: Record<string, string> = {};
  let score = 0;

  for (let i = 0; i < patternSegments.length; i += 1) {
    const patternSegment = patternSegments[i] || "";
    const targetSegment = targetSegments[i];

    if (patternSegment === "*" || patternSegment.endsWith("*")) {
      const name = patternSegment.startsWith(":") ? patternSegment.slice(1, -1) : "wildcard";
      params[name] = targetSegments.slice(i).map(decodeSegment).join("/");
      score += 1;
      break;
    }

    if (!targetSegment) return null;

    if (patternSegment.startsWith(":")) {
      params[patternSegment.slice(1)] = decodeSegment(targetSegment);
      score += 3;
      continue;
    }

    if (patternSegment !== targetSegment) return null;
    score += 20;
  }

  return {
    params,
    score,
    isExact: false,
  };
}

export function findBestMenuRouteMatch<TItem>(
  items: TItem[],
  target: string,
  getPath: (item: TItem) => string | undefined
): MenuRouteMatch<TItem> | null {
  let bestMatch: MenuRouteMatch<TItem> | null = null;

  for (const item of items) {
    const path = getPath(item);
    const match = matchMenuRoutePath(path, target);
    if (!match) continue;

    const normalizedPath = normalizeMenuRoutePath(path);
    const candidate: MenuRouteMatch<TItem> = {
      ...match,
      item,
      path: normalizedPath,
    };

    if (!bestMatch || candidate.score > bestMatch.score || (
      candidate.score === bestMatch.score && candidate.path.length > bestMatch.path.length
    )) {
      bestMatch = candidate;
    }
  }

  return bestMatch;
}
