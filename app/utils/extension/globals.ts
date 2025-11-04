/**
 * Centralized configuration for extension globals
 * Single source of truth for all composables/APIs available in extensions
 */

// Vue 3 Composition API globals
export const VUE_GLOBALS = {
  // Core reactivity
  ref: true,
  reactive: true,
  computed: true,
  readonly: true,
  shallowRef: true,
  shallowReactive: true,
  
  // Lifecycle hooks
  onMounted: true,
  onUnmounted: true,
  onBeforeMount: true,
  onBeforeUnmount: true,
  onUpdated: true,
  onBeforeUpdate: true,
  
  // Watchers
  watch: true,
  watchEffect: true,
  
  defineProps: true,
  defineEmits: true,
  defineExpose: true,
  
  // Utils
  nextTick: true,
  toRef: true,
  toRefs: true,
  unref: true,
  isRef: true,
  markRaw: true,
  toRaw: true,
  isProxy: true,
  isReactive: true,
  isReadonly: true,
};

// Nuxt 3 composables
export const NUXT_GLOBALS = {
  // Navigation
  useRoute: true,
  useRouter: true,
  navigateTo: true,
  
  useState: true,
  useCookie: true,
  
  useFetch: true,
  useAsyncData: true,
  useLazyFetch: true,
  
  // SEO & Meta
  useHead: true,
  useSeoMeta: true,
  
  // App context
  useNuxtApp: true,
  useRuntimeConfig: true,
  
  // UI
  useToast: true,
};

// Enfyra custom composables
export const ENFYRA_GLOBALS = {
  // API
  useApi: true,
  
  // Schema & Forms
  useSchema: true,
  useFilterQuery: true,
  
  // UI & State
  useHeaderActionRegistry: true,
  useScreen: true,
  useGlobalState: true,
  useConfirm: true,
  useMounted: true,
  useLoader: true,
  
  // Auth & Permissions
  useEnfyraAuth: true,
  usePermissions: true,
  
  // Menu system
  useMenuRegistry: true,
  useMenuApi: true,
};

// Combined globals for ESLint
export const EXTENSION_GLOBALS = {
  ...VUE_GLOBALS,
  ...NUXT_GLOBALS,
  ...ENFYRA_GLOBALS,
  
  // Browser APIs
  fetch: true,
  console: true,
  window: true,
  document: true,
  
  // Legacy/misc
  $ctx: true,
};

export const EXTENSION_COMPOSABLES = {
  // Enfyra API composables
  useApi: 'useApi',
  useHeaderActionRegistry: 'useHeaderActionRegistry',
  useSubHeaderActionRegistry: 'useSubHeaderActionRegistry',
  useSchema: 'useSchema',
  useScreen: 'useScreen',
  useGlobalState: 'useGlobalState',
  useConfirm: 'useConfirm',
  useEnfyraAuth: 'useEnfyraAuth',
  usePermissions: 'usePermissions',
  
  // Nuxt composables
  useToast: 'useToast',
  useState: 'useState',
  useRoute: 'useRoute',
  useRouter: 'useRouter',
  useCookie: 'useCookie',
  useNuxtApp: 'useNuxtApp',
  navigateTo: 'navigateTo',
  useFetch: 'useFetch',
  useAsyncData: 'useAsyncData',
  useLazyFetch: 'useLazyFetch',
  useHead: 'useHead',
  useSeoMeta: 'useSeoMeta',
} as const;

// Helper function to create composable mapping from imports
export const createComposableMap = (imports: any) => {
  const map: Record<string, any> = {};
  Object.keys(EXTENSION_COMPOSABLES).forEach(key => {
    if (imports[key]) {
      map[key] = imports[key];
    }
  });
  return map;
};

// Vue functions to inject into extension runtime
export const EXTENSION_VUE_FUNCTIONS = [
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
  'resolveComponent',
  'h',
  'defineComponent',
  'defineProps',
  'defineEmits',
  'defineExpose',
  'toRef',
  'toRefs',
  'unref',
  'isRef',
  'shallowRef',
  'triggerRef',
  'customRef',
  'shallowReactive',
  'readonly',
  'shallowReadonly',
  'isProxy',
  'isReactive', 
  'isReadonly',
  'toRaw',
  'markRaw',
  'effectScope',
  'getCurrentScope',
  'onScopeDispose',
] as const;