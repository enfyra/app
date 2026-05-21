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
import { matchMenuRoutePath, normalizeMenuRoutePath } from "~/utils/menu-route-patterns";

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
const { findBestMenuMatch } = useMenuRegistry();
const perf = useExtensionPerf();

const normalizedPath = computed(() => {
  return normalizeMenuRoutePath(props.path);
});

const matchedMenu = computed(() => findBestMenuMatch(normalizedPath.value)?.item ?? null);
const matchedMenuPath = computed(() => matchedMenu.value ? normalizeMenuRoutePath(matchedMenu.value.route || matchedMenu.value.path) : "");
const extensionMetaCacheKey = computed(() => matchedMenu.value ? `menu:${matchedMenu.value.id}` : normalizedPath.value);

const error = ref<string | null>(null);
const extensionComponent = ref<any>(null);
const currentExtensionMeta = ref<any>(null);
const isLoading = ref(true);
const loadRunId = ref(0);

const {
  data: menuResponse,
  error: menuError,
  execute: executeFetchMenu,
} = useApi(() => "/menu_definition", {
  query: computed(() => ({
    fields: "*,extension.*",
    filter: {
      _and: [
        { id: { _eq: matchedMenu.value?.id } },
        { isEnabled: { _eq: true } },
      ],
    },
  })),
  errorContext: "Fetch Menu with Extension",
  immediate: false,
});

const tryLoadFromCache = (): boolean => {
  const cachedMeta = getCachedExtensionMeta(extensionMetaCacheKey.value);
  if (!cachedMeta) return false;

  const cachedComponent = getCachedComponent(cachedMeta.extensionId, cachedMeta.updatedAt);
  if (cachedComponent) {
    currentExtensionMeta.value = cachedMeta;
    extensionComponent.value = cachedComponent;
    return true;
  }

  return false;
};

const isCurrentLoad = (runId: number) => loadRunId.value === runId;

const loadMatchingExtension = async () => {
  const runId = ++loadRunId.value;
  error.value = null;

  if (!matchedMenu.value) {
    showError({
      statusCode: 404,
      statusMessage: "Page Not Found",
      message: `No menu found for route: ${normalizedPath.value}`,
      fatal: true,
    });
    return;
  }

  if (tryLoadFromCache()) {
    if (isCurrentLoad(runId)) {
      setRouteLoading(false);
      isLoading.value = false;
    }
    return;
  }

  setRouteLoading(true);
  await fetchAndLoadExtension(runId);
  if (isCurrentLoad(runId)) {
    setRouteLoading(false);
    isLoading.value = false;
  }
};

const fetchAndLoadExtension = async (runId: number) => {
  try {
    await perf.time("Route: fetchMenu", () => executeFetchMenu());
    if (!isCurrentLoad(runId)) return;

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

    setCachedExtensionMeta(extensionMetaCacheKey.value, extension);

    const cachedComponent = getCachedComponent(extension.extensionId, extension.updatedAt);
    if (cachedComponent) {
      if (!isCurrentLoad(runId)) return;
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
    if (!isCurrentLoad(runId)) return;
    extensionComponent.value = component;

  } catch (err: any) {
    if (!isCurrentLoad(runId)) return;
    error.value = `Failed to load extension: ${err?.message || err}`;
  }
};

watch(extensionCacheInvalidation, async (invalidation) => {
  const runId = ++loadRunId.value;
  const currentExtension = currentExtensionMeta.value || getCachedExtensionMeta(extensionMetaCacheKey.value) || menuResponse.value?.data?.[0]?.extension;
  const invalidationPath = invalidation?.path;
  const matchesPath = invalidationPath != null && (
    String(invalidationPath) === props.path
    || String(invalidationPath) === normalizedPath.value
    || matchMenuRoutePath(String(invalidationPath), normalizedPath.value) != null
    || matchMenuRoutePath(matchedMenuPath.value, String(invalidationPath)) != null
  );
  if (!matchesPath && !isExtensionInvalidationMatch(currentExtension, invalidation)) return;

  isLoading.value = true;
  error.value = null;
  extensionComponent.value = null;
  setRouteLoading(true);
  await fetchAndLoadExtension(runId);
  if (isCurrentLoad(runId)) {
    setRouteLoading(false);
    isLoading.value = false;
  }
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
