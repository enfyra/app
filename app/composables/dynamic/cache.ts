const extensionCache = new Map<string, any>();
const maxCacheSize = 50;
const cacheHits = ref(0);
const cacheMisses = ref(0);

export const extensionMetaCache = useState<Map<string, any>>(
  "extension-meta-cache",
  () => new Map()
);

function buildCacheKey(extensionName: string, updatedAt?: string | Date): string {
  return `${extensionName}:${updatedAt ? new Date(updatedAt).getTime() : Date.now()}`;
}

function clearOldVersions(extensionId: string): void {
  for (const [key] of extensionCache) {
    if (key.startsWith(`${extensionId}:`)) {
      extensionCache.delete(key);
    }
  }
}

function manageCacheSize(): void {
  if (extensionCache.size >= maxCacheSize) {
    const firstKey = extensionCache.keys().next().value;
    if (firstKey) {
      extensionCache.delete(firstKey);
    }
  }
}

export function isComponentCached(
  extensionName: string,
  updatedAt?: string | Date
): boolean {
  const cacheKey = buildCacheKey(extensionName, updatedAt);
  return extensionCache.has(cacheKey);
}

export function getCachedComponent(
  extensionName: string,
  updatedAt?: string | Date
): any {
  const cacheKey = buildCacheKey(extensionName, updatedAt);
  return extensionCache.get(cacheKey) || null;
}

export function setCachedComponent(
  extensionName: string,
  component: any,
  updatedAt?: string | Date
): void {
  clearOldVersions(extensionName);
  manageCacheSize();
  const cacheKey = buildCacheKey(extensionName, updatedAt);
  extensionCache.set(cacheKey, component);
}

export function getCachedExtensionMeta(path: string): any {
  return extensionMetaCache.value.get(path);
}

export function setCachedExtensionMeta(path: string, extensionData: any): void {
  extensionMetaCache.value.set(path, extensionData);
}

export function clearCache(extensionId?: string): void {
  if (extensionId) {
    clearOldVersions(extensionId);
  } else {
    extensionCache.clear();
  }
  cacheHits.value = 0;
  cacheMisses.value = 0;
}

export function getCacheStats(): CacheStats {
  const total = cacheHits.value + cacheMisses.value;
  return {
    size: extensionCache.size,
    hits: cacheHits.value,
    misses: cacheMisses.value,
    hitRate: total > 0 ? ((cacheHits.value / total) * 100).toFixed(2) + "%" : "0%",
    keys: Array.from(extensionCache.keys()),
    memoryEstimate: `~${extensionCache.size * 50}KB`,
  };
}

export function incrementCacheHits(): void {
  cacheHits.value++;
}

export function incrementCacheMisses(): void {
  cacheMisses.value++;
}
