import { markRaw } from "vue";
import {
  UIcon,
  UButton,
  UCard,
  UBadge,
  UInput,
  UTextarea,
  USelect,
  UCheckbox,
  USwitch,
  UModal,
  UPopover,
  UTooltip,
  UAlert,
  UAvatar,
  UProgress,
  UTable,
  UPagination,
  UBreadcrumb,
  UTabs,
  UAccordion,
  UForm,
  CommonLoadingState,
  CommonEmptyState,
  CommonSettingsCard,
  CommonImage,
  PermissionGate,
  FormEditor,
  CommonUploadModal,
  DynamicWidgetComponent,
  FilterDrawer,
  DataTable,
} from "#components";

import {
  // Enfyra composables
  useHeaderActionRegistry,
  useSubHeaderActionRegistry,
  useSchema,
  useScreen,
  useGlobalState,
  useConfirm,
  useEnfyraAuth,
  usePermissions,
  useFilterQuery,
  useDataTableColumns,
  useApi,
  // Nuxt composables
  useToast,
  useState,
  useRoute,
  useRouter,
  useCookie,
  useNuxtApp,
  navigateTo,
  useFetch,
  useAsyncData,
  useLazyFetch,
  useHead,
  useSeoMeta,
} from "#imports";

import { EXTENSION_VUE_FUNCTIONS } from "../../utils/extension/globals";

// Extension cache with version-based invalidation
const extensionCache = new Map<string, any>();
const maxCacheSize = 50;
const cacheHits = ref(0);
const cacheMisses = ref(0);

// Extension metadata cache using Nuxt state
const extensionMetaCache = useState<Map<string, any>>(
  "extension-meta-cache",
  () => new Map()
);

const isComponentCached = (
  extensionName: string,
  updatedAt?: string | Date
) => {
  const cacheKey = `${extensionName}:${
    updatedAt ? new Date(updatedAt).getTime() : Date.now()
  }`;
  return extensionCache.has(cacheKey);
};

const getCachedExtensionMeta = (path: string) => {
  return extensionMetaCache.value.get(path);
};

const setCachedExtensionMeta = (path: string, extensionData: any) => {
  extensionMetaCache.value.set(path, extensionData);
};

export const useDynamicComponent = () => {
  // Get components directly imported
  const availableComponents = {
    // UI Components
    UIcon: markRaw(UIcon),
    Icon: markRaw(UIcon), // Alias for compatibility
    UButton: markRaw(UButton),
    UCard: markRaw(UCard),
    UBadge: markRaw(UBadge),
    UInput: markRaw(UInput),
    UTextarea: markRaw(UTextarea),
    USelect: markRaw(USelect),
    UCheckbox: markRaw(UCheckbox),
    USwitch: markRaw(USwitch),
    UModal: markRaw(UModal),
    UPopover: markRaw(UPopover),
    UTooltip: markRaw(UTooltip),
    UAlert: markRaw(UAlert),
    UAvatar: markRaw(UAvatar),
    UProgress: markRaw(UProgress),
    UTable: markRaw(UTable),
    DataTable: markRaw(DataTable),
    UPagination: markRaw(UPagination),
    UBreadcrumb: markRaw(UBreadcrumb),
    UTabs: markRaw(UTabs),
    UAccordion: markRaw(UAccordion),
    UForm: markRaw(UForm),

    // Core Components
    PermissionGate: markRaw(PermissionGate),
    FormEditor: markRaw(FormEditor),

    // Filter Components
    FilterDrawer: markRaw(FilterDrawer),

    // Common Components
    LoadingState: markRaw(CommonLoadingState),
    EmptyState: markRaw(CommonEmptyState),
    SettingsCard: markRaw(CommonSettingsCard),
    Image: markRaw(CommonImage),
    UploadModal: markRaw(CommonUploadModal),

    // Dynamic Components
    Widget: markRaw(DynamicWidgetComponent),
  };

  /**
   * Clear old versions of a specific extension from cache
   */
  const clearOldVersions = (extensionId: string) => {
    for (const [key] of extensionCache) {
      if (key.startsWith(`${extensionId}:`)) {
        extensionCache.delete(key);
      }
    }
  };

  /**
   * Manage cache size with LRU strategy
   */
  const manageCacheSize = () => {
    if (extensionCache.size >= maxCacheSize) {
      // Remove oldest entry (first in map)
      const firstKey = extensionCache.keys().next().value;
      if (firstKey) {
        extensionCache.delete(firstKey);
      }
    }
  };

  /**
   * Clear cache for specific extension or all
   */
  const clearCache = (extensionId?: string) => {
    if (extensionId) {
      clearOldVersions(extensionId);
    } else {
      extensionCache.clear();
    }
    // Reset stats
    cacheHits.value = 0;
    cacheMisses.value = 0;
  };

  /**
   * Get cache statistics
   */
  const getCacheStats = () => ({
    size: extensionCache.size,
    hits: cacheHits.value,
    misses: cacheMisses.value,
    hitRate:
      cacheHits.value + cacheMisses.value > 0
        ? (
            (cacheHits.value / (cacheHits.value + cacheMisses.value)) *
            100
          ).toFixed(2) + "%"
        : "0%",
    keys: Array.from(extensionCache.keys()),
    memoryEstimate: `~${extensionCache.size * 50}KB`, // Rough estimate
  });

  const loadDynamicComponent = async (
    compiledCode: string,
    extensionName: string,
    updatedAt?: string | Date,
    forceReload = false
  ) => {
    try {
      // Only run on client-side
      if (typeof window === "undefined") {
        throw new Error("Extensions can only be loaded on client-side");
      }

      // Create cache key with updatedAt timestamp
      const cacheKey = `${extensionName}:${
        updatedAt ? new Date(updatedAt).getTime() : Date.now()
      }`;

      // Check cache unless force reload
      if (!forceReload && extensionCache.has(cacheKey)) {
        cacheHits.value++;
        return extensionCache.get(cacheKey);
      }

      cacheMisses.value++;

      // Clear old versions of this extension
      clearOldVersions(extensionName);

      // 1. Setup globals if not already done
      if (!(window as any).Vue) {
        (window as any).Vue = await import("vue");
      }

      // Inject composables globally
      const g = globalThis as any;

      // Direct injection - no need for createComposableMap filtering
      const composables = {
        // Enfyra composables
        useApi,
        useHeaderActionRegistry,
        useSubHeaderActionRegistry,
        useSchema,
        useScreen,
        useGlobalState,
        useConfirm,
        useEnfyraAuth,
        usePermissions,
        useFilterQuery,
        useDataTableColumns,
        // Nuxt composables
        useToast,
        useState,
        useRoute,
        useRouter,
        useCookie,
        useNuxtApp,
        navigateTo,
        useFetch,
        useAsyncData,
        useLazyFetch,
        useHead,
        useSeoMeta,
      };

      // Inject all composables directly
      Object.entries(composables).forEach(([key, composable]) => {
        if (typeof composable === "function") {
          g[key] = composable;
        } else {
          console.warn(
            `Extension composable ${key} is not a function`,
            composable
          );
        }
      });

      // Inject Vue functions dynamically from config
      const vue = await import("vue");
      EXTENSION_VUE_FUNCTIONS.forEach((fnName) => {
        g[fnName] = vue[fnName];
      });

      // 2. Execute the code
      // Sử dụng tên extension được truyền vào để tìm component
      const componentName = extensionName;

      // Clear any existing component with same name
      delete (window as any)[componentName];

      // Create and execute script
      const script = document.createElement("script");
      script.textContent = compiledCode;
      script.type = "text/javascript";

      // Execute script synchronously
      document.head.appendChild(script);

      // Wait a bit for script to execute
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Remove script after execution
      document.head.removeChild(script);

      // Check if component was registered
      const component = (window as any)[componentName];
      if (!component) {
        // No fallback allowed - must match exact component name
        const availableExtensions = Object.keys(window as any).filter(
          (k) =>
            k.startsWith(extensionName) ||
            k.startsWith(extensionName.toLowerCase())
        );

        throw new Error(
          `Component "${componentName}" not found. Expected exact match for extension "${extensionName}". Available extensions: ${availableExtensions.join(
            ", "
          )}`
        );
      }

      // 3. Create wrapper component with injected dependencies
      if (!component || typeof component !== "object") {
        throw new Error(`Invalid component: ${component}`);
      }

      const wrappedComponent = markRaw({
        ...component,
        components: availableComponents,
      });

      // Cache the compiled component
      manageCacheSize();
      extensionCache.set(cacheKey, wrappedComponent);

      return markRaw(wrappedComponent);
    } catch (error: any) {
      throw new Error(`Failed to load component: ${error?.message || error}`);
    }
  };

  return {
    loadDynamicComponent,
    clearCache,
    getCacheStats,
    isComponentCached,
    getCachedExtensionMeta,
    setCachedExtensionMeta,
  };
};
