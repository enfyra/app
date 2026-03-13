<template>
  <div>
    <div
      v-if="loading"
      class="flex items-center gap-2 text-sm text-gray-400"
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
      class="flex items-center gap-2 text-sm text-red-500"
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
      class="text-sm text-gray-400"
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

const { loadDynamicComponent, getCachedComponent, getCachedExtensionMeta, setCachedExtensionMeta } = useDynamicComponent();

const error = ref<string | null>(null);
const widgetComponent = ref<any>(null);
const loading = ref(false);

const {
  data: extensionResponse,
  error: extensionError,
  execute: executeFetchExtension,
} = useApi(() => "/extension_definition", {
  query: computed(() => ({
    fields: "*",
    filter: {
      _and: [
        { id: { _eq: props.id } },
        { isEnabled: { _eq: true } },
        { type: { _eq: "widget" } },
      ],
    },
  })),
  errorContext: "Fetch Widget Extension",
  immediate: false,
});

const tryLoadFromCache = (): boolean => {
  const widgetPath = `widget:${props.id}`;
  const cachedMeta = getCachedExtensionMeta(widgetPath);
  if (!cachedMeta) return false;

  const cachedComponent = getCachedComponent(cachedMeta.extensionId, cachedMeta.updatedAt);
  if (cachedComponent) {
    widgetComponent.value = cachedComponent;
    return true;
  }

  return false;
};

const loadMatchingWidget = async () => {
  error.value = null;

  if (tryLoadFromCache()) {
    return;
  }

  loading.value = true;
  await fetchAndLoadWidget();
  loading.value = false;
};

const fetchAndLoadWidget = async () => {
  try {
    await executeFetchExtension();

    if (extensionError.value) {
      error.value = `API Error: ${extensionError.value}`;
      return;
    }

    if (!extensionResponse.value?.data || extensionResponse.value.data.length === 0) {
      error.value = `No widget found with ID: ${props.id}`;
      return;
    }

    const extension = extensionResponse.value.data[0];

    if (!extension.isEnabled) {
      error.value = `Widget "${extension.name}" is currently disabled. Please contact an administrator to enable this widget.`;
      return;
    }

    const widgetPath = `widget:${props.id}`;
    setCachedExtensionMeta(widgetPath, extension);

    const cachedComponent = getCachedComponent(extension.extensionId, extension.updatedAt);
    if (cachedComponent) {
      widgetComponent.value = cachedComponent;
      return;
    }

    const component = await loadDynamicComponent(
      extension.compiledCode || extension.code,
      extension.extensionId,
      extension.updatedAt
    );

    widgetComponent.value = component;

  } catch (err: any) {
    error.value = `Failed to load widget: ${err?.message || err}`;
  }
};

const retry = () => {
  loadMatchingWidget();
};

watch(
  () => props.id,
  () => {
    loadMatchingWidget();
  },
  { immediate: true }
);
</script>
