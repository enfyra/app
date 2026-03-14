import { getPackages } from "./packages";

const EXTENSION_VUE_FUNCTIONS = [
  'ref',
  'reactive',
  'computed',
  'watch',
  'watchEffect',
  'onMounted',
  'onUnmounted',
  'onBeforeMount',
  'onBeforeUnmount',
  'onUpdated',
  'onBeforeUpdate',
  'nextTick',
  'h',
  'defineComponent',
  'defineProps',
  'defineEmits',
  'defineExpose',
  'withDefaults',
];

export async function setupVueGlobals(): Promise<void> {
  if (typeof window === "undefined") return;

  (window as any).Vue = await import("vue");
}

export async function getVueRuntime(): Promise<any> {
  return await import("vue");
}

export function exposeVueGlobals(g: any): void {
  const vue = g.Vue || (window as any).Vue;

  EXTENSION_VUE_FUNCTIONS.forEach((fnName) => {
    g[fnName] = vue[fnName];
  });

  g.vueVersion = vue.version;
  g.Transition = vue.Transition;
  g.TransitionGroup = vue.TransitionGroup;
  g.KeepAlive = vue.KeepAlive;
  g.Teleport = vue.Teleport;
  g.Suspense = vue.Suspense;
}

export function getComposablesObject(): Record<string, any> {
  return {
    useState: () => {
      throw new Error('useState must be used within a Nuxt setup context');
    },
    useRoute: () => {
      throw new Error('useRoute must be used within a Nuxt setup context');
    },
    useRouter: () => {
      throw new Error('useRouter must be used within a Nuxt setup context');
    },
    useApi: () => {
      throw new Error('useApi must be used within a Nuxt setup context');
    },
    useToast: () => {
      throw new Error('useToast must be used within a Nuxt setup context');
    },
    useSchema: () => {
      throw new Error('useSchema must be used within a Nuxt setup context');
    },
    useScreen: () => {
      throw new Error('useScreen must be used within a Nuxt setup context');
    },
    useGlobalState: () => {
      throw new Error('useGlobalState must be used within a Nuxt setup context');
    },
    usePermissions: () => {
      throw new Error('usePermissions must be used within a Nuxt setup context');
    },
    useFilterQuery: () => {
      throw new Error('useFilterQuery must be used within a Nuxt setup context');
    },
    useDataTableColumns: () => {
      throw new Error('useDataTableColumns must be used within a Nuxt setup context');
    },
    useHeaderActionRegistry: () => {
      throw new Error('useHeaderActionRegistry must be used within a Nuxt setup context');
    },
    useSubHeaderActionRegistry: () => {
      throw new Error('useSubHeaderActionRegistry must be used within a Nuxt setup context');
    },
    usePageHeaderRegistry: () => {
      throw new Error('usePageHeaderRegistry must be used within a Nuxt setup context');
    },
    useConfirm: () => {
      throw new Error('useConfirm must be used within a Nuxt setup context');
    },
    useEnfyraAuth: () => {
      throw new Error('useEnfyraAuth must be used within a Nuxt setup context');
    },
    useEnfyra: () => {
      throw new Error('useEnfyra must be used within a Nuxt setup context');
    },
    navigateTo: () => {
      throw new Error('navigateTo must be used within a Nuxt setup context');
    },
    useFetch: () => {
      throw new Error('useFetch must be used within a Nuxt setup context');
    },
    useAsyncData: () => {
      throw new Error('useAsyncData must be used within a Nuxt setup context');
    },
    useLazyFetch: () => {
      throw new Error('useLazyFetch must be used within a Nuxt setup context');
    },
    useHead: () => {
      throw new Error('useHead must be used within a Nuxt setup context');
    },
    useSeoMeta: () => {
      throw new Error('useSeoMeta must be used within a Nuxt setup context');
    },
    useCookie: () => {
      throw new Error('useCookie must be used within a Nuxt setup context');
    },
    useNuxtApp: () => {
      throw new Error('useNuxtApp must be used within a Nuxt setup context');
    },
  };
}

export function exposeComposables(g: any, composables: Record<string, any>): void {
  Object.entries(composables).forEach(([key, composable]) => {
    if (typeof composable === "function") {
      g[key] = composable;
    }
  });
}

export function setupPackagesGlobal(g: any): void {
  if (!g.packages) {
    g.packages = {};
    if (typeof window !== "undefined") {
      (window as any).packages = g.packages;
    }
  }

  if (!g.getPackages) {
    g.getPackages = (packageNames?: string[]) => getPackages(packageNames);
    if (typeof window !== "undefined") {
      (window as any).getPackages = g.getPackages;
    }
  }
}

export async function executeScriptInWindow(compiledCode: string, extensionName: string): Promise<any> {
  delete (window as any)[extensionName];

  const script = document.createElement("script");
  script.textContent = compiledCode;
  script.type = "text/javascript";

  document.head.appendChild(script);
  await new Promise((resolve) => setTimeout(resolve, 10));
  document.head.removeChild(script);

  return (window as any)[extensionName];
}

export function findComponentInWindow(extensionName: string): any {
  const component = (window as any)[extensionName];

  if (!component) {
    const availableExtensions = Object.keys(window as any).filter(
      (k) =>
        k.startsWith(extensionName) ||
        k.startsWith(extensionName.toLowerCase())
    );
    throw new Error(
      `Component "${extensionName}" not found. Expected exact match for extension "${extensionName}". Available extensions: ${availableExtensions.join(", ")}`
    );
  }

  return component;
}
