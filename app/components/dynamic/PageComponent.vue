<template>
  <div v-if="isLoading" />

  <CommonEmptyState
    v-else-if="error"
    :title="
      error.includes('disabled') ? 'Extension Disabled' : 'Extension Error'
    "
    :description="error"
    :icon="
      error.includes('disabled')
        ? 'i-heroicons-lock-closed'
        : 'i-heroicons-exclamation-triangle'
    "
    size="md"
    :action="
      error.includes('disabled')
        ? {
            label: 'Go to Extension Settings',
            onClick: async () => {
              await navigateTo('/settings/extensions');
            },
            icon: 'i-heroicons-cog-6-tooth',
          }
        : {
            label: 'Retry',
            onClick: retry,
            icon: 'i-heroicons-arrow-path',
          }
    "
  />

  <PermissionGate
    v-else-if="extensionComponent"
    :condition="menuResponse?.data[0]?.permission ?? { allowAll: true }"
    class="flex-1 flex flex-col"
  >
    <component
      :is="extensionComponent"
      class="flex-1"
    />
  </PermissionGate>

  <CommonEmptyState
    v-else
    title="Extension Not Found"
    :description="`No extension found for route: ${props.path}`"
    icon="i-heroicons-puzzle-piece"
    size="md"
    :action="{
      label: 'Browse Extensions',
      onClick: async () => {
        await navigateTo('/settings/extensions');
      },
      icon: 'i-heroicons-cog-6-tooth',
    }"
  />
</template>

<script setup lang="ts">
interface Props {
  path: string;
}

const props = defineProps<Props>();

const {
  loadDynamicComponent,
  getCachedComponent,
  getCachedExtensionMeta,
  setCachedExtensionMeta,
  extensionCacheInvalidation,
  isExtensionInvalidationMatch,
} = useDynamicComponent();
const { setRouteLoading } = useGlobalState();
const { menuItems } = useMenuRegistry();
const perf = useExtensionPerf();

const normalizedPath = computed(() => {
  const p = props.path || "";
  return p.startsWith("/") ? p : `/${p}`;
});

const isPathRegisteredInMenu = () => {
  const target = normalizedPath.value;
  return menuItems.value.some((item) => {
    const route = item.route || item.path;
    if (!route) return false;
    const normalized = route.startsWith("/") ? route : `/${route}`;
    return normalized === target;
  });
};

const error = ref<string | null>(null);
const extensionComponent = ref<any>(null);
const currentExtensionMeta = ref<any>(null);
const isLoading = ref(true);

const {
  data: menuResponse,
  error: menuError,
  execute: executeFetchMenu,
} = useApi(() => "/menu_definition", {
  query: computed(() => ({
    fields: "*,extension.*",
    filter: {
      _and: [
        {
          _or: [
            { path: { _eq: props.path } },
            { path: { _eq: `/${props.path}` } },
          ],
        },
        { isEnabled: { _eq: true } },
      ],
    },
  })),
  errorContext: "Fetch Menu with Extension",
  immediate: false,
});

const tryLoadFromCache = (): boolean => {
  const cachedMeta = getCachedExtensionMeta(props.path);
  if (!cachedMeta) return false;

  const cachedComponent = getCachedComponent(cachedMeta.extensionId, cachedMeta.updatedAt);
  if (cachedComponent) {
    currentExtensionMeta.value = cachedMeta;
    extensionComponent.value = cachedComponent;
    return true;
  }

  return false;
};

const loadMatchingExtension = async () => {
  error.value = null;

  if (!isPathRegisteredInMenu()) {
    showError({
      statusCode: 404,
      statusMessage: "Page Not Found",
      message: `No menu found for route: ${normalizedPath.value}`,
      fatal: true,
    });
    return;
  }

  if (tryLoadFromCache()) {
    isLoading.value = false;
    return;
  }

  setRouteLoading(true);
  await fetchAndLoadExtension();
  setRouteLoading(false);
  isLoading.value = false;
};

const fetchAndLoadExtension = async () => {
  try {
    await perf.time("Route: fetchMenu", () => executeFetchMenu());

    if (menuError.value) {
      error.value = `API Error: ${menuError.value}`;
      return;
    }

    if (!menuResponse.value?.data || menuResponse.value.data.length === 0) {
      error.value = `No menu found for route: /${props.path}`;
      return;
    }

    const menuItem = menuResponse.value.data[0];

    if (!menuItem.extension || menuItem.extension.length === 0) {
      error.value = `No extension found for route: /${props.path}`;
      return;
    }

    const extension = menuItem.extension;
    currentExtensionMeta.value = extension;

    if (!extension.isEnabled) {
      error.value = `Extension "${extension.name}" is currently disabled. Please contact an administrator to enable this extension.`;
      return;
    }

    setCachedExtensionMeta(props.path, extension);

    const cachedComponent = getCachedComponent(extension.extensionId, extension.updatedAt);
    if (cachedComponent) {
      extensionComponent.value = cachedComponent;
      return;
    }

    const component = await perf.time("Route: loadDynamicComponent", () =>
      loadDynamicComponent(
        extension.compiledCode || extension.code,
        extension.extensionId,
        extension.updatedAt,
        false,
        extension.code
      )
    );
    extensionComponent.value = component;

  } catch (err: any) {
    error.value = `Failed to load extension: ${err?.message || err}`;
  }
};

watch(extensionCacheInvalidation, async (invalidation) => {
  const currentExtension = currentExtensionMeta.value || getCachedExtensionMeta(props.path) || menuResponse.value?.data?.[0]?.extension;
  const invalidationPath = invalidation?.path;
  const matchesPath = invalidationPath != null && (
    String(invalidationPath) === props.path
    || String(invalidationPath) === normalizedPath.value
  );
  if (!matchesPath && !isExtensionInvalidationMatch(currentExtension, invalidation)) return;

  isLoading.value = true;
  error.value = null;
  extensionComponent.value = null;
  setRouteLoading(true);
  await fetchAndLoadExtension();
  setRouteLoading(false);
  isLoading.value = false;
});

const retry = () => {
  isLoading.value = true;
  loadMatchingExtension();
};

watch(
  () => props.path,
  () => {
    isLoading.value = true;
    extensionComponent.value = null;
    currentExtensionMeta.value = null;
    loadMatchingExtension();
  },
  { immediate: true }
);
</script>
