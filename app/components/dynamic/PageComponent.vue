<template>
  <Transition name="loading-fade" mode="out-in">
    <CommonLoadingState
      v-if="!isMounted || componentLoading"
      title="Loading extension..."
      description="Fetching extension component"
      size="md"
      type="table"
      context="page"
    />

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
        :components="extensionComponent.components"
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
  </Transition>
</template>

<script setup lang="ts">
interface Props {
  path: string;
}

const props = defineProps<Props>();

const { isMounted } = useMounted();
const { loadDynamicComponent, isComponentCached, getCachedExtensionMeta, setCachedExtensionMeta } = useDynamicComponent();

const error = ref<string | null>(null);
const extensionComponent = ref<any>(null);
const componentLoading = ref(false);

const {
  data: menuResponse,
  error: menuError,
  pending: loading,
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
});

const loadMatchingExtension = async () => {
  error.value = null;

  const cachedMeta = getCachedExtensionMeta(props.path);
  if (cachedMeta) {
    
    const isCached = isComponentCached(cachedMeta.extensionId, cachedMeta.updatedAt);
    
    if (isCached) {
      try {
        const component = await loadDynamicComponent(
          cachedMeta.compiledCode || cachedMeta.code,
          cachedMeta.extensionId,
          cachedMeta.updatedAt
        );
        extensionComponent.value = component;
        return; 
      } catch (err: any) {
        console.warn('❌ Failed to load cached component:', err);
      }
    }
  }

  componentLoading.value = true;
  await fetchAndLoadExtension();
};

const fetchAndLoadExtension = async () => {
  try {
    await executeFetchMenu();

    if (menuError.value) {
      error.value = `API Error: ${menuError.value}`;
      componentLoading.value = false;
      return;
    }

    if (!menuResponse.value?.data || menuResponse.value.data.length === 0) {
      error.value = `No menu found for route: /${props.path}`;
      componentLoading.value = false;
      return;
    }

    const menuItem = menuResponse.value.data[0];

    if (!menuItem.extension || menuItem.extension.length === 0) {
      error.value = `No extension found for route: /${props.path}`;
      componentLoading.value = false;
      return;
    }

    const extension = menuItem.extension;

    if (!extension.isEnabled) {
      error.value = `Extension "${extension.name}" is currently disabled. Please contact an administrator to enable this extension.`;
      componentLoading.value = false;
      return;
    }

    setCachedExtensionMeta(props.path, extension);

    const isCached = isComponentCached(extension.extensionId, extension.updatedAt);

    const component = await loadDynamicComponent(
      extension.compiledCode || extension.code,
      extension.extensionId,
      extension.updatedAt
    );
    extensionComponent.value = component;

  } catch (err: any) {
    error.value = `Failed to load extension: ${err?.message || err}`;
  } finally {
    componentLoading.value = false;
  }
};

const retry = () => {
  loadMatchingExtension();
};

watch(
  () => props.path,
  () => {
    loadMatchingExtension();
  },
  { immediate: true }
);
</script>