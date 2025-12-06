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
  UDrawer,
  UDropdownMenu,
  UContextMenu,
  USkeleton,
  UCollapsible,
  USeparator,
  URadioGroup,
  UCheckboxGroup,
  UInputNumber,
  UInputDate,
  UInputTime,
  UInputTags,
  UFileUpload,
  UColorPicker,
  USlider,
  UStepper,
  UTimeline,
  UMarquee,
  UCommandPalette,
  UCarousel,
  UCalendar,
  UTree,
  UPinInput,
  ULink,
  UContainer,
  UPage,
  UPageHeader,
  UPageHero,
  UPageGrid,
  UPageCard,
  UPageSection,
  UPageBody,
  UPageAside,
  UPageCTA,
  UPageFeature,
  UPageLinks,
  UPageList,
  UPageLogos,
  UPageAnchors,
  UPageColumns,
  UError,
  UEmpty,
  UFooter,
  UFooterColumns,
  UHeader,
  UMain,
  UOverlayProvider,
  UToast,
  UToaster,
  UFormField,
  UFieldGroup,
  UInputMenu,
  USelectMenu,
  ULinkBase,
  UUser,
  UAvatarGroup,
  UChip,
  UKbd,
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
  useHeaderActionRegistry,
  useSubHeaderActionRegistry,
  usePageHeaderRegistry,
  useSchema,
  useScreen,
  useGlobalState,
  useConfirm,
  useEnfyraAuth,
  usePermissions,
  useFilterQuery,
  useDataTableColumns,
  useApi,
  useEnfyraApi,
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

const extensionCache = new Map<string, any>();
const maxCacheSize = 50;
const cacheHits = ref(0);
const cacheMisses = ref(0);

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
  const availableComponents = {
    UIcon: markRaw(UIcon),
    Icon: markRaw(UIcon),
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
    UDrawer: markRaw(UDrawer),
    UDropdownMenu: markRaw(UDropdownMenu),
    UContextMenu: markRaw(UContextMenu),
    USkeleton: markRaw(USkeleton),
    UCollapsible: markRaw(UCollapsible),
    USeparator: markRaw(USeparator),
    URadioGroup: markRaw(URadioGroup),
    UCheckboxGroup: markRaw(UCheckboxGroup),
    UInputNumber: markRaw(UInputNumber),
    UInputDate: markRaw(UInputDate),
    UInputTime: markRaw(UInputTime),
    UInputTags: markRaw(UInputTags),
    UFileUpload: markRaw(UFileUpload),
    UColorPicker: markRaw(UColorPicker),
    USlider: markRaw(USlider),
    UStepper: markRaw(UStepper),
    UTimeline: markRaw(UTimeline),
    UMarquee: markRaw(UMarquee),
    UCommandPalette: markRaw(UCommandPalette),
    UCarousel: markRaw(UCarousel),
    UCalendar: markRaw(UCalendar),
    UTree: markRaw(UTree),
    UPinInput: markRaw(UPinInput),
    ULink: markRaw(ULink),
    UContainer: markRaw(UContainer),
    UPage: markRaw(UPage),
    UPageHeader: markRaw(UPageHeader),
    UPageHero: markRaw(UPageHero),
    UPageGrid: markRaw(UPageGrid),
    UPageCard: markRaw(UPageCard),
    UPageSection: markRaw(UPageSection),
    UPageBody: markRaw(UPageBody),
    UPageAside: markRaw(UPageAside),
    UPageCTA: markRaw(UPageCTA),
    UPageFeature: markRaw(UPageFeature),
    UPageLinks: markRaw(UPageLinks),
    UPageList: markRaw(UPageList),
    UPageLogos: markRaw(UPageLogos),
    UPageAnchors: markRaw(UPageAnchors),
    UPageColumns: markRaw(UPageColumns),
    UError: markRaw(UError),
    UEmpty: markRaw(UEmpty),
    UFooter: markRaw(UFooter),
    UFooterColumns: markRaw(UFooterColumns),
    UHeader: markRaw(UHeader),
    UMain: markRaw(UMain),
    UOverlayProvider: markRaw(UOverlayProvider),
    UToast: markRaw(UToast),
    UToaster: markRaw(UToaster),
    UFormField: markRaw(UFormField),
    UFieldGroup: markRaw(UFieldGroup),
    UInputMenu: markRaw(UInputMenu),
    USelectMenu: markRaw(USelectMenu),
    ULinkBase: markRaw(ULinkBase),
    UUser: markRaw(UUser),
    UAvatarGroup: markRaw(UAvatarGroup),
    UChip: markRaw(UChip),
    UKbd: markRaw(UKbd),
    PermissionGate: markRaw(PermissionGate),
    FormEditor: markRaw(FormEditor),
    FilterDrawer: markRaw(FilterDrawer),
    LoadingState: markRaw(CommonLoadingState),
    EmptyState: markRaw(CommonEmptyState),
    SettingsCard: markRaw(CommonSettingsCard),
    Image: markRaw(CommonImage),
    UploadModal: markRaw(CommonUploadModal),
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
      if (typeof window === "undefined") {
        throw new Error("Extensions can only be loaded on client-side");
      }

      const cacheKey = `${extensionName}:${
        updatedAt ? new Date(updatedAt).getTime() : Date.now()
      }`;

      if (!forceReload && extensionCache.has(cacheKey)) {
        cacheHits.value++;
        return extensionCache.get(cacheKey);
      }

      cacheMisses.value++;

      clearOldVersions(extensionName);

      // 1. Setup globals if not already done
      if (!(window as any).Vue) {
        (window as any).Vue = await import("vue");
      }

      const g = globalThis as any;

      const composables = {
        useApi,
        useEnfyraApi,
        useHeaderActionRegistry,
        useSubHeaderActionRegistry,
        usePageHeaderRegistry,
        useSchema,
        useScreen,
        useGlobalState,
        useConfirm,
        useEnfyraAuth,
        usePermissions,
        useFilterQuery,
        useDataTableColumns,
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

      const vue = await import("vue");
      EXTENSION_VUE_FUNCTIONS.forEach((fnName) => {
        g[fnName] = vue[fnName];
      });

      // 2. Execute the code
      const componentName = extensionName;

      delete (window as any)[componentName];

      const script = document.createElement("script");
      script.textContent = compiledCode;
      script.type = "text/javascript";

      document.head.appendChild(script);

      await new Promise((resolve) => setTimeout(resolve, 10));

      document.head.removeChild(script);

      const component = (window as any)[componentName];
      if (!component) {
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
