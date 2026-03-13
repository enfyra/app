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
  >
    <component
      :is="extensionComponent"
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

const { loadDynamicComponent, getCachedComponent, getCachedExtensionMeta, setCachedExtensionMeta } = useDynamicComponent();
const { setRouteLoading } = useGlobalState();

const error = ref<string | null>(null);
const extensionComponent = ref<any>(null);
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
    extensionComponent.value = cachedComponent;
    return true;
  }

  return false;
};

const loadMatchingExtension = async () => {
  error.value = null;

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
    await executeFetchMenu();

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

    const component = await loadDynamicComponent(
      extension.compiledCode || extension.code,
      extension.extensionId,
      extension.updatedAt
    );
    extensionComponent.value = component;

  } catch (err: any) {
    error.value = `Failed to load extension: ${err?.message || err}`;
  }
};

const retry = () => {
  isLoading.value = true;
  loadMatchingExtension();
};

watch(
  () => props.path,
  () => {
    isLoading.value = true;
    extensionComponent.value = null;
    loadMatchingExtension();
  },
  { immediate: true }
);
</script>
