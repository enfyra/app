<template>
  <div class="dynamic-page-stack">
  <Transition name="fade" mode="out-in">
    <div
      v-if="isLoading"
      key="loading-frame"
      class="flex flex-1 flex-col gap-4"
      role="status"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div class="surface-card rounded-[var(--radius-card)] p-5 lg:p-6">
        <CommonLoadingSkeleton type="text" :lines="2" />
      </div>
      <div class="grid gap-4 grid-cols-1 md:grid-cols-2 2xl:grid-cols-3">
        <div
          v-for="i in 3"
          :key="i"
          class="surface-card rounded-[var(--radius-card)] p-5"
        >
          <CommonLoadingSkeleton type="text" :lines="3" />
        </div>
      </div>
    </div>

    <CommonEmptyState
      v-else-if="error"
      key="error-state"
      :title="
        isDisabledError ? 'Extension Disabled' : 'Extension Error'
      "
      :description="error"
      :icon="
        isDisabledError
          ? 'i-heroicons-lock-closed'
          : 'i-heroicons-exclamation-triangle'
      "
      size="md"
      :action="
        isDisabledError
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

    <div
      v-else-if="extensionComponent"
      key="extension-content"
      class="flex-1 flex flex-col"
    >
      <component
        :is="extensionComponent"
        class="flex-1"
      />
    </div>

    <CommonEmptyState
      v-else
      key="not-found-state"
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
  </div>
</template>

<script setup lang="ts">
import { matchMenuRoutePath, normalizeMenuRoutePath } from "~/utils/menu-route-patterns";
import { EXTENSION_RUNTIME_FIELDS, prefixFields } from "~/utils/extension-fields";

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
const { beginRouteLoading } = useGlobalState();
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
let endRouteLoading: (() => void) | null = null;
const isDisabledError = computed(() => error.value?.includes("disabled") ?? false);

const {
  data: menuResponse,
  error: menuError,
  execute: executeFetchMenu,
} = useApi(() => "/enfyra_menu", {
  query: computed(() => ({
    fields: [
      "*",
      prefixFields("extension", EXTENSION_RUNTIME_FIELDS),
    ].join(","),
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

const startRouteLoading = () => {
  endRouteLoading?.();
  const endLoading = beginRouteLoading();
  endRouteLoading = endLoading;
  return endLoading;
};

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
    isLoading.value = false;
    await fetchAndLoadExtension(runId);
    return;
  }

  const endLoading = startRouteLoading();
  try {
    await fetchAndLoadExtension(runId);
  } finally {
    if (isCurrentLoad(runId)) {
      endLoading();
      if (endRouteLoading === endLoading) endRouteLoading = null;
      isLoading.value = false;
    }
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

    if (tryLoadFromCache()) {
      return;
    }

    const cachedComponent = getCachedComponent(extension.extensionId, extension.updatedAt);
    if (cachedComponent) {
      if (!isCurrentLoad(runId)) return;
      extensionComponent.value = cachedComponent;
      return;
    }

    const component = await perf.time("Route: loadDynamicComponent", () =>
      loadDynamicComponent(
        extension.compiledCode!,
        extension.extensionId,
        extension.updatedAt,
        false,
      )
    );
    if (!isCurrentLoad(runId)) return;
    extensionComponent.value = component;

  } catch (err: any) {
    if (!isCurrentLoad(runId)) return;
    error.value = `Failed to load extension: ${err?.message || err}`;
  }
};

watch(() => extensionCacheInvalidation.value, async (invalidation) => {
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

  error.value = null;
  if (!extensionComponent.value) {
    isLoading.value = true;
  }
  const endLoading = startRouteLoading();
  try {
    await fetchAndLoadExtension(runId);
  } finally {
    if (isCurrentLoad(runId)) {
      endLoading();
      if (endRouteLoading === endLoading) endRouteLoading = null;
      isLoading.value = false;
    }
  }
});

const retry = () => {
  isLoading.value = true;
  extensionComponent.value = null;
  loadMatchingExtension();
};

const formatRuntimeError = (err: unknown, info: string) => {
  const extensionName = currentExtensionMeta.value?.name || currentExtensionMeta.value?.extensionId || props.path;
  const message = err instanceof Error ? err.message : String(err || "Unknown Vue runtime error");
  const lifecycle = info ? ` during ${info}` : "";
  return `Extension "${extensionName}" failed${lifecycle}: ${message}`;
};

onErrorCaptured((err, _instance, info) => {
  error.value = formatRuntimeError(err, info);
  extensionComponent.value = null;
  isLoading.value = false;
  endRouteLoading?.();
  console.error("[Dynamic page extension] Runtime error", {
    path: normalizedPath.value,
    extension: currentExtensionMeta.value?.name || currentExtensionMeta.value?.extensionId,
    info,
    error: err,
  });
  return false;
});

onBeforeUnmount(() => {
  endRouteLoading?.();
});

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

<style scoped>
.dynamic-page-stack {
  display: grid;
  flex: 1 1 0%;
  min-height: 0;
  min-width: 0;
  width: 100%;
  grid-template-columns: minmax(0, 1fr);
}

.dynamic-page-stack > * {
  grid-area: 1 / 1;
  min-width: 0;
}
</style>
