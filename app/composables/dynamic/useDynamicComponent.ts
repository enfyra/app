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
} from "#app";

import {
  // @ts-ignore
  useHeaderActionRegistry,
  // @ts-ignore
  useSubHeaderActionRegistry,
  // @ts-ignore
  usePageHeaderRegistry,
  // @ts-ignore
  useSchema,
  // @ts-ignore
  useScreen,
  // @ts-ignore
  useGlobalState,
  // @ts-ignore
  useConfirm,
  // @ts-ignore
  useEnfyraAuth,
  // @ts-ignore
  usePermissions,
  // @ts-ignore
  useFilterQuery,
  // @ts-ignore
  useDataTableColumns,
  // @ts-ignore
  useApi,
  // @ts-ignore
  useToast,
  // @ts-ignore
  useEnfyra
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
  const loadingPackages = new Map<string, Promise<any>>();

  const loadSinglePackage = async (
    packageName: string,
    packagesObject: Record<string, any>,
    options: { useCacheBuster?: boolean; silent?: boolean } = {}
  ): Promise<any> => {
    if (loadingPackages.has(packageName)) {
      return loadingPackages.get(packageName)!;
    }

    if (packagesObject[packageName] !== undefined) {
      return Promise.resolve(packagesObject[packageName]);
    }

    const promise = (async () => {
      try {
        const cacheBuster = options.useCacheBuster ? `?_=${Date.now()}` : '';
        const moduleResult = await import(/* @vite-ignore */ `/api/packages/${encodeURIComponent(packageName)}${cacheBuster}`);

        const executedResult = moduleResult.default !== undefined
          ? moduleResult.default
          : moduleResult;

        packagesObject[packageName] = executedResult;

        const safeName = packageName.replace(/[^a-zA-Z0-9]/g, '_');
        if (safeName !== packageName) {
          packagesObject[safeName] = executedResult;
        }

        if (typeof window !== 'undefined') {
          (window as any).packages[packageName] = executedResult;
          if (safeName !== packageName) {
            (window as any).packages[safeName] = executedResult;
          }
        }

        return executedResult;
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        const isModuleResolutionError =
          errorMessage.includes('Failed to resolve module specifier') ||
          errorMessage.includes('Relative references must start with') ||
          errorMessage.includes('Failed to fetch dynamically imported module') ||
          errorMessage.includes('404') ||
          errorMessage.includes('ERR_ABORTED');

        if (!isModuleResolutionError && !options.silent) {
          console.warn(`Failed to import package ${packageName}:`, error);
        }
        packagesObject[packageName] = null;
        return null;
      } finally {
        loadingPackages.delete(packageName);
      }
    })();

    loadingPackages.set(packageName, promise);
    return promise;
  };

  const detectPackages = (code: string): string[] => {
    const packagePattern = /const\s*\{([^}]+)\}\s*=\s*(?:await\s+)?getPackages\(\)/g;
    const matches = [...code.matchAll(packagePattern)];
    const packages: string[] = [];

    for (const match of matches) {
      if (match[1]) {
        const destructured = match[1];
        const items = destructured.split(',').map(s => s.trim());
        packages.push(...items);
      }
    }

    return [...new Set(packages)];
  };

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

  const clearOldVersions = (extensionId: string) => {
    for (const [key] of extensionCache) {
      if (key.startsWith(`${extensionId}:`)) {
        extensionCache.delete(key);
      }
    }
  };

  const manageCacheSize = () => {
    if (extensionCache.size >= maxCacheSize) {
      const firstKey = extensionCache.keys().next().value;
      if (firstKey) {
        extensionCache.delete(firstKey);
      }
    }
  };

  const clearCache = (extensionId?: string) => {
    if (extensionId) {
      clearOldVersions(extensionId);
    } else {
      extensionCache.clear();
    }
    cacheHits.value = 0;
    cacheMisses.value = 0;
  };

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
    memoryEstimate: `~${extensionCache.size * 50}KB`, 
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

      if (!(window as any).Vue) {
        (window as any).Vue = await import("vue");
      }

      const g = globalThis as any;

      const composables = {
        useApi,
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

  const loadExtensionComponentPreview = async (
    compiledCode: string,
    extensionName: string,
    previewState?: {
      headerActions: Ref<any[]>;
      subHeaderActions: Ref<any[]>;
      pageHeader: Ref<any>;
    },
    originalCode?: string
  ) => {
    try {
      if (typeof window === "undefined") {
        throw new Error("Extensions can only be loaded on client-side");
      }

      if (!(window as any).Vue) {
        (window as any).Vue = await import("vue");
      }

      const g = globalThis as any;
      const packagesObject: Record<string, any> = {};

      g.packages = packagesObject;
      if (typeof window !== 'undefined') {
        (window as any).packages = packagesObject;
      }

      if (originalCode) {
        const requiredPackages = detectPackages(originalCode);
        console.log('[Preview] Preloading packages:', requiredPackages);

        await Promise.all(
          requiredPackages.map(pkg =>
            loadSinglePackage(pkg, packagesObject, { useCacheBuster: true, silent: false })
              .then(result => {
                console.log(`[Preview] Loaded package ${pkg}:`, result);
                return result;
              })
          )
        );

        console.log('[Preview] All packages loaded. packagesObject:', packagesObject);
      }

      const getPackagesWrapper = () => packagesObject;
      g.getPackages = getPackagesWrapper;
      if (typeof window !== 'undefined') {
        (window as any).getPackages = getPackagesWrapper;
      }

      const headerActionsRef = previewState?.headerActions || ref<any[]>([]);
      const subHeaderActionsRef = previewState?.subHeaderActions || ref<any[]>([]);
      const pageHeaderRef = previewState?.pageHeader || ref<any>(null);

      const mockUseHeaderActionRegistry = (actions?: any) => {
        if (actions) {
          const actionsArray = Array.isArray(actions) ? actions : [actions];
          actionsArray.forEach((action: any) => {
            headerActionsRef.value.push(action);
          });
        }
        return {
          headerActions: headerActionsRef,
          register: (action: any) => {
            headerActionsRef.value.push(action);
          },
        };
      };

      const mockUseSubHeaderActionRegistry = (actions?: any) => {
        if (actions) {
          const actionsArray = Array.isArray(actions) ? actions : [actions];
          actionsArray.forEach((action: any) => {
            subHeaderActionsRef.value.push(action);
          });
        }
        return {
          subHeaderActions: subHeaderActionsRef,
          register: (action: any) => {
            subHeaderActionsRef.value.push(action);
          },
        };
      };

      const mockUsePageHeaderRegistry = () => {
        return {
          pageHeader: pageHeaderRef,
          registerPageHeader: (config: any) => {
            pageHeaderRef.value = config;
          },
        };
      };

      const composables = {
        useApi,
        useHeaderActionRegistry: mockUseHeaderActionRegistry,
        useSubHeaderActionRegistry: mockUseSubHeaderActionRegistry,
        usePageHeaderRegistry: mockUsePageHeaderRegistry,
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
        }
      });

      const vue = await import("vue");
      EXTENSION_VUE_FUNCTIONS.forEach((fnName) => {
        g[fnName] = vue[fnName];
      });

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
          `Component "${componentName}" not found. Available: ${availableExtensions.join(", ")}`
        );
      }

      // Validate component
      if (typeof component !== "object" || component === null) {
        throw new Error(`Invalid component: ${typeof component}. Component must be an object.`);
      }

      // Check if component has at least one of: render, setup, template, hoặc là một function
      const isValidComponent = 
        typeof component === "function" ||
        component.render ||
        component.setup ||
        component.template ||
        component.__v_isVNode !== undefined;

      if (!isValidComponent) {
        console.warn('Component may not be valid Vue component:', component);
        // Vẫn tiếp tục, có thể là component hợp lệ nhưng không có các properties trên
      }

      const wrappedComponent = markRaw({
        ...component,
        components: availableComponents,
      });

      return markRaw(wrappedComponent);
    } catch (error: any) {
      throw new Error(`Failed to load preview component: ${error?.message || error}`);
    }
  };

  const getPackages = async (includeExecutedCode = true) => {
    try {
      if (typeof window === "undefined") {
        throw new Error("Packages can only be loaded on client-side");
      }

      const g = globalThis as any;

      if (includeExecutedCode && g.packages && Object.keys(g.packages).length > 0) {
        const hasNullPackages = Object.values(g.packages).some((pkg: any) => pkg === null);
        if (!hasNullPackages) {
          return g.packages;
        }
      }

      const response = await fetch("/api/packages");
      if (!response.ok) {
        throw new Error(`Failed to fetch packages list: ${response.statusText}`);
      }

      const data = await response.json();
      const packages = data.data || [];

      if (!includeExecutedCode) {
        const packagesObject: Record<string, any> = {};
        packages.forEach((pkg: any) => {
          packagesObject[pkg.name] = {
            name: pkg.name,
            version: pkg.version,
            description: pkg.description,
            dependencies: pkg.dependencies || {},
          };
        });
        return packagesObject;
      }

      const packagesObject: Record<string, any> = g.packages || {};

      if (!g.packages) {
        g.packages = packagesObject;
        if (typeof window !== 'undefined') {
          (window as any).packages = packagesObject;
        }
      }

      await Promise.all(
        packages.map(async (pkg: any) => {
          if (packagesObject[pkg.name] && packagesObject[pkg.name] !== null) {
            return;
          }

          if (pkg.name.startsWith('@types/') ||
              pkg.name.includes('/') && !pkg.name.startsWith('@')) {
            packagesObject[pkg.name] = null;
            return;
          }

          await loadSinglePackage(pkg.name, packagesObject, { useCacheBuster: false, silent: true });
        })
      );

      g.packages = packagesObject;
      if (typeof window !== 'undefined') {
        (window as any).packages = packagesObject;
      }

      return packagesObject;
    } catch (error: any) {
      throw new Error(`Failed to get packages: ${error?.message || error}`);
    }
  };

  return {
    loadDynamicComponent,
    loadExtensionComponentPreview,
    getPackages,
    clearCache,
    getCacheStats,
    isComponentCached,
    getCachedExtensionMeta,
    setCachedExtensionMeta,
  };
};
