import { getPackages } from "./packages";

const EXTENSION_VUE_FUNCTIONS = [
  'ref',
  'reactive',
  'computed',
  'watch',
  'watchEffect',
  'watchDeep',
  'watchSyncEffect',
  'watchPostEffect',
  'onMounted',
  'onUnmounted',
  'onBeforeMount',
  'onBeforeUnmount',
  'onUpdated',
  'onBeforeUpdate',
  'onActivated',
  'onDeactivated',
  'onErrorCaptured',
  'onRenderTracked',
  'onRenderTriggered',
  'onServerPrefetch',
  'nextTick',
  'h',
  'defineComponent',
  'defineProps',
  'defineEmits',
  'defineExpose',
  'withDefaults',
  'shallowRef',
  'shallowReactive',
  'shallowReadonly',
  'toRef',
  'toRefs',
  'toValue',
  'unref',
  'isRef',
  'isReactive',
  'isReadonly',
  'isProxy',
  'toRaw',
  'markRaw',
  'triggerRef',
  'customRef',
  'readonly',
  'provide',
  'inject',
  'useSlots',
  'useAttrs',
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
    useState,
    useRoute,
    useRouter,
    useApi,
    useToast,
    useSchema,
    useScreen,
    useGlobalState,
    usePermissions,
    useFilterQuery,
    useDataTableColumns,
    useHeaderActionRegistry,
    useSubHeaderActionRegistry,
    usePageHeaderRegistry,
    useConfirm,
    useEnfyraAuth,
    useEnfyra,
    navigateTo,
    useFetch,
    useAsyncData,
    useLazyFetch,
    useHead,
    useSeoMeta,
    useCookie,
    useNuxtApp,
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
