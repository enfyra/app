const extensionCache = new Map<string, any>();
const maxCacheSize = 50;
const cacheHits = ref(0);
const cacheMisses = ref(0);

export type ExtensionCacheInvalidationReason = "created" | "updated" | "deleted" | "status";

export interface ExtensionCacheInvalidation {
  token: number;
  reason: ExtensionCacheInvalidationReason;
  id?: string | number | null;
  extensionId?: string | number | null;
  path?: string | null;
  updatedAt?: string | Date | null;
}

export const extensionMetaCache = useState<Map<string, any>>(
  "extension-meta-cache",
  () => new Map()
);

export const extensionCacheInvalidation = useState<ExtensionCacheInvalidation | null>(
  "extension-cache-invalidation",
  () => null
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

function getExtensionRecordId(extensionData: any): string | null {
  const id = extensionData?.id ?? extensionData?._id;
  return id == null ? null : String(id);
}

function getExtensionRuntimeId(extensionData: any): string | null {
  const id = extensionData?.extensionId;
  return id == null ? null : String(id);
}

function getPathVariants(path?: string | null): Set<string> {
  if (!path) return new Set();
  const rawPath = String(path);
  const withLeadingSlash = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const withoutLeadingSlash = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;
  return new Set([rawPath, withLeadingSlash, withoutLeadingSlash]);
}

function matchesExtensionInvalidation(
  extensionData: any,
  invalidation: Pick<ExtensionCacheInvalidation, "id" | "extensionId" | "path">
): boolean {
  const invalidationId = invalidation.id == null ? null : String(invalidation.id);
  const invalidationExtensionId = invalidation.extensionId == null ? null : String(invalidation.extensionId);
  const invalidationPath = invalidation.path == null ? null : String(invalidation.path);
  const recordId = getExtensionRecordId(extensionData);
  const runtimeId = getExtensionRuntimeId(extensionData);
  const menuPath = extensionData?.menu?.path == null ? null : String(extensionData.menu.path);
  const pathVariants = getPathVariants(invalidationPath);

  return Boolean(
    (invalidationId && recordId === invalidationId)
    || (invalidationExtensionId && runtimeId === invalidationExtensionId)
    || (menuPath && pathVariants.has(menuPath))
  );
}

export function isExtensionInvalidationMatch(
  extensionData: any,
  invalidation: ExtensionCacheInvalidation | null
): boolean {
  if (!extensionData || !invalidation) return false;
  return matchesExtensionInvalidation(extensionData, invalidation);
}

export function invalidateExtensionCache(
  invalidation: Omit<ExtensionCacheInvalidation, "token">
): void {
  if (invalidation.extensionId != null) {
    clearOldVersions(String(invalidation.extensionId));
  }

  const pathVariants = getPathVariants(invalidation.path);
  for (const [path, extensionData] of extensionMetaCache.value) {
    const matchesPath = pathVariants.has(String(path));
    if (!matchesPath && !matchesExtensionInvalidation(extensionData, invalidation)) continue;

    const runtimeId = getExtensionRuntimeId(extensionData);
    if (runtimeId) {
      clearOldVersions(runtimeId);
    }
    extensionMetaCache.value.delete(path);
  }

  extensionCacheInvalidation.value = {
    ...invalidation,
    token: (extensionCacheInvalidation.value?.token ?? 0) + 1,
  };
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
