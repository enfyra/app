<template>
  <div>
    <div
      v-if="loading"
      class="flex items-center gap-2 text-sm eapp-text-quaternary"
    >
      <UIcon
        name="i-heroicons-arrow-path-20-solid"
        class="animate-spin"
        size="16"
      />
      <span>Loading...</span>
    </div>

    <div
      v-else-if="error"
      class="flex items-center gap-2 text-sm text-[var(--md-error)]"
    >
      <UIcon
        :name="error.includes('disabled') ? 'i-heroicons-lock-closed' : 'i-heroicons-exclamation-triangle'"
        size="16"
      />
      <span>Widget error</span>
      <UButton
        v-if="!error.includes('disabled')"
        size="xs"
        variant="ghost"
        icon="i-heroicons-arrow-path"
        @click="retry"
        class="ml-1"
      />
    </div>

    <component
      v-else-if="widgetComponent"
      :is="widgetComponent"
      :components="widgetComponent.components"
      v-bind="$attrs"
    />

    <div
      v-else
      class="text-sm eapp-text-quaternary"
    >
      Widget #{{ props.id }} not found
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  id: string | number;
}

const props = defineProps<Props>();

defineOptions({
  inheritAttrs: false
});

const {
  loadDynamicComponent,
  getCachedComponent,
  getCachedExtensionMeta,
  extensionCacheInvalidation,
  isExtensionInvalidationMatch,
} = useDynamicComponent();
const {
  getWidgetMetaCacheKey,
  loadWidgetExtension,
} = useDynamicWidgetLoader();

const error = ref<string | null>(null);
const widgetComponent = ref<any>(null);
const currentExtensionMeta = ref<any>(null);
const loading = ref(false);
const loadRunId = ref(0);

const tryLoadFromCache = (): boolean => {
  const widgetPath = getWidgetMetaCacheKey(props.id);
  const cachedMeta = getCachedExtensionMeta(widgetPath);
  if (!cachedMeta) return false;

  const cachedComponent = getCachedComponent(cachedMeta.extensionId, cachedMeta.updatedAt);
  if (cachedComponent) {
    currentExtensionMeta.value = cachedMeta;
    widgetComponent.value = cachedComponent;
    return true;
  }

  return false;
};

const isCurrentLoad = (runId: number) => loadRunId.value === runId;

const loadMatchingWidget = async () => {
  const runId = ++loadRunId.value;
  error.value = null;

  if (tryLoadFromCache()) {
    return;
  }

  loading.value = true;
  await fetchAndLoadWidget(runId);
  if (isCurrentLoad(runId)) {
    loading.value = false;
  }
};

const fetchAndLoadWidget = async (runId: number) => {
  try {
    const extension = await loadWidgetExtension(props.id);
    if (!isCurrentLoad(runId)) return;

    if (!extension) {
      error.value = `No widget found with ID: ${props.id}`;
      return;
    }

    currentExtensionMeta.value = extension;

    if (!extension.isEnabled) {
      error.value = `Widget "${extension.name}" is currently disabled. Please contact an administrator to enable this widget.`;
      return;
    }

    if (!extension.extensionId) {
      error.value = `Widget "${extension.name}" is missing a runtime extension ID.`;
      return;
    }

    const cachedComponent = getCachedComponent(extension.extensionId, extension.updatedAt);
    if (cachedComponent) {
      if (!isCurrentLoad(runId)) return;
      widgetComponent.value = cachedComponent;
      return;
    }

    const component = await loadDynamicComponent(
      extension.compiledCode!,
      extension.extensionId,
      extension.updatedAt
    );

    if (!isCurrentLoad(runId)) return;
    widgetComponent.value = component;

  } catch (err: any) {
    if (!isCurrentLoad(runId)) return;
    error.value = `Failed to load widget: ${err?.message || err}`;
  }
};

watch(() => extensionCacheInvalidation.value, async (invalidation) => {
  const runId = ++loadRunId.value;
  const widgetPath = getWidgetMetaCacheKey(props.id);
  const currentExtension = currentExtensionMeta.value || getCachedExtensionMeta(widgetPath);
  const matchesByRecordId = invalidation?.id != null && String(invalidation.id) === String(props.id);
  if (!matchesByRecordId && !isExtensionInvalidationMatch(currentExtension, invalidation)) return;

  loading.value = true;
  error.value = null;
  widgetComponent.value = null;
  await fetchAndLoadWidget(runId);
  if (isCurrentLoad(runId)) {
    loading.value = false;
  }
});

const retry = () => {
  loadMatchingWidget();
};

watch(
  () => props.id,
  () => {
    currentExtensionMeta.value = null;
    loadMatchingWidget();
  },
  { immediate: true }
);
</script>
