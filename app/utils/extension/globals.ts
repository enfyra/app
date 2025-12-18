

export const VUE_GLOBALS = {
  
  ref: true,
  reactive: true,
  computed: true,
  readonly: true,
  shallowRef: true,
  shallowReactive: true,

  onMounted: true,
  onUnmounted: true,
  onBeforeMount: true,
  onBeforeUnmount: true,
  onUpdated: true,
  onBeforeUpdate: true,

  watch: true,
  watchEffect: true,
  
  defineProps: true,
  defineEmits: true,
  defineExpose: true,

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

export const NUXT_GLOBALS = {
  
  useRoute: true,
  useRouter: true,
  navigateTo: true,
  
  useState: true,
  useCookie: true,
  
  useFetch: true,
  useAsyncData: true,
  useLazyFetch: true,

  useHead: true,
  useSeoMeta: true,

  useNuxtApp: true,
  useRuntimeConfig: true,

  useToast: true,
};

export const ENFYRA_GLOBALS = {
  
  useApi: true,

  useSchema: true,
  useFilterQuery: true,

  useHeaderActionRegistry: true,
  useScreen: true,
  useGlobalState: true,
  useConfirm: true,
  useMounted: true,
  useLoader: true,

  useEnfyraAuth: true,
  usePermissions: true,

  useMenuRegistry: true,
  useMenuApi: true,
};

export const EXTENSION_GLOBALS = {
  ...VUE_GLOBALS,
  ...NUXT_GLOBALS,
  ...ENFYRA_GLOBALS,

  fetch: true,
  console: true,
  window: true,
  document: true,

  $ctx: true,
};

export const EXTENSION_COMPOSABLES = {
  
  useApi: 'useApi',
  useHeaderActionRegistry: 'useHeaderActionRegistry',
  useSubHeaderActionRegistry: 'useSubHeaderActionRegistry',
  useSchema: 'useSchema',
  useScreen: 'useScreen',
  useGlobalState: 'useGlobalState',
  useConfirm: 'useConfirm',
  useEnfyraAuth: 'useEnfyraAuth',
  usePermissions: 'usePermissions',

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

export const createComposableMap = (imports: any) => {
  const map: Record<string, any> = {};
  Object.keys(EXTENSION_COMPOSABLES).forEach(key => {
    if (imports[key]) {
      map[key] = imports[key];
    }
  });
  return map;
};

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