<template>
  <div class="ai-config-page">
    <Transition name="loading-fade" mode="out-in">
      <div
        v-if="!isMounted || loading"
        class="space-y-3"
      >
        <div
          v-for="i in 5"
          :key="i"
          class="bg-[var(--bg-surface)] border border-white/[0.06] rounded-lg p-4"
        >
          <div class="hidden md:flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-2">
                <USkeleton class="w-5 h-5 rounded" />
                <USkeleton class="h-5 w-32 rounded" />
                <USkeleton class="h-5 w-16 rounded" />
                <USkeleton class="h-5 w-16 rounded" />
              </div>
              <USkeleton class="h-4 w-3/4 rounded mb-2" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="w-10 h-6 rounded-full" />
              <USkeleton class="w-20 h-8 rounded" />
            </div>
          </div>
          <div class="md:hidden space-y-3">
            <div class="flex items-start gap-3">
              <USkeleton class="w-6 h-6 rounded flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <USkeleton class="h-5 w-32 rounded mb-2" />
                <div class="flex gap-1.5 mb-2">
                  <USkeleton class="h-5 w-20 rounded" />
                  <USkeleton class="h-5 w-16 rounded" />
                </div>
                <USkeleton class="h-4 w-full rounded" />
              </div>
            </div>
            <div class="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
              <div class="flex items-center gap-2">
                <USkeleton class="h-3 w-12 rounded" />
                <USkeleton class="w-10 h-6 rounded-full" />
              </div>
              <USkeleton class="w-16 h-8 rounded" />
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="aiConfigs.length > 0"
        class="space-y-3"
      >
        <CommonListItem
          v-for="config in aiConfigs"
          :key="config.id"
          :title="config.provider || 'AI Provider'"
          :description="config.description || 'No description provided'"
          icon="lucide:brain"
          icon-class="text-primary"
          @click="navigateToDetail(config)"
        >
          <template #title>
            <div class="flex items-center gap-2">
                <h3 class="font-semibold text-white">{{ config.provider || 'AI Provider' }}</h3>
                <UBadge variant="subtle" color="primary" size="sm">
                  {{ config.model || 'N/A' }}
                </UBadge>
                <UBadge
                  variant="subtle"
                  :color="config.isEnabled ? 'success' : 'neutral'"
                  size="sm"
                >
                  {{ config.isEnabled ? 'Active' : 'Inactive' }}
                </UBadge>
              </div>
          </template>
          <template #footer>
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-400">Status:</span>
                <USwitch
                  v-if="checkPermissionCondition({ or: [{ route: '/ai_config_definition', actions: ['update'] }] })"
                  :model-value="config.isEnabled"
                  :disabled="getConfigLoader(config.id.toString()).isLoading"
                  @update:model-value="toggleConfigStatus(config)"
                />
              </div>
              <UButton
                v-if="checkPermissionCondition({ or: [{ route: '/ai_config_definition', actions: ['delete'] }] })"
                icon="i-lucide-trash-2"
                variant="outline"
                color="error"
                size="sm"
                @click="deleteConfig(config)"
              >
                <span class="hidden sm:inline">Delete</span>
              </UButton>
            </div>
          </template>
        </CommonListItem>
      </div>

      <CommonEmptyState
        v-else
        title="No AI configurations found"
        description="No AI configurations have been created yet"
        icon="lucide:brain"
        size="lg"
      />
    </Transition>

    <div
      v-if="!loading && aiConfigs.length > 0 && total > limit"
      class="flex items-center justify-between mt-6"
    >
      <UPagination
        v-model:page="page"
        :items-per-page="limit"
        :total="total"
        show-edges
        :sibling-count="1"
        :to="
          (p) => ({
            path: route.path,
            query: { ...route.query, page: p },
          })
        "
        :ui="{
          item: 'h-9 w-9 rounded-xl transition-all duration-300',
        }"
      />
      <p class="hidden md:block text-sm text-gray-400">
        Showing <span class="text-gray-200">{{ (page - 1) * limit + 1 }}-{{ Math.min(page * limit, total) }}</span> of <span class="text-gray-200">{{ total }}</span> results
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const page = ref(1);
const limit = 9;

const toast = useToast();
const { confirm } = useConfirm();
const { createLoader } = useLoader();
const { checkPermissionCondition } = usePermissions();
const { getId } = useDatabase();
const { fetchAiConfig } = useGlobalState();

const { isMounted } = useMounted();
const route = useRoute();
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "AI Configuration",
  gradient: "cyan",
});

const {
  data: apiData,
  pending: loading,
  execute: fetchAiConfigs,
} = useApi(() => "/ai_config_definition", {
  query: computed(() => ({
    fields: ["*"].join(","),
    limit,
    page: page.value,
    meta: "*",
    sort: ["id"].join(","),
  })),
  errorContext: "Fetch AI Configurations",
});

const aiConfigs = computed(() => apiData.value?.data || []);
const total = computed(() => apiData.value?.meta?.totalCount || 0);

const configLoaders = ref<Record<string, any>>({});

const { execute: updateConfig, error: updateError } = useApi(
  () => `/ai_config_definition`,
  {
    method: "patch",
    errorContext: "Update AI Configuration",
  }
);

useHeaderActionRegistry([
  {
    id: "create-ai-config",
    label: "Create AI Config",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
    to: "/ai-agent/config/create",
    permission: {
      and: [
        {
          route: "/ai_config_definition",
          actions: ["create"],
        },
      ],
    },
  },
]);

function navigateToDetail(config: any) {
  navigateTo(`/ai-agent/config/${getId(config)}`);
}

function getConfigLoader(configId: string) {
  if (!configLoaders.value[configId]) {
    configLoaders.value[configId] = createLoader();
  }
  return configLoaders.value[configId];
}

const toggleConfigStatus = async (config: any) => {
  const loader = getConfigLoader(config.id.toString());
  const newStatus = !config.isEnabled;

  if (apiData.value?.data) {
    const configIndex = apiData.value.data.findIndex(
      (c: any) => c.id === config.id
    );
    if (configIndex !== -1) {
      apiData.value.data[configIndex].isEnabled = newStatus;
    }
  }

  await loader.withLoading(() =>
    updateConfig({
      body: {
        isEnabled: newStatus,
      },
      id: config.id,
    })
  );

  if (updateError.value) {
    if (apiData.value?.data) {
      const configIndex = apiData.value.data.findIndex(
        (c: any) => c.id === config.id
      );
      if (configIndex !== -1) {
        apiData.value.data[configIndex].isEnabled = !newStatus;
      }
    }
    return;
  }

  toast.add({
    title: "Success",
    description: `AI configuration "${config.provider}" has been ${
      newStatus ? "activated" : "deactivated"
    } successfully!`,
    color: "success",
  });

  // Reload AI configs in global state
  await fetchAiConfig();
};

const { execute: deleteConfigApi, error: deleteError } = useApi(
  () => `/ai_config_definition`,
  {
    method: "delete",
    errorContext: "Delete AI Configuration",
  }
);

const deleteConfig = async (config: any) => {
  const isConfirmed = await confirm({
    title: "Delete AI Configuration",
    content: `Are you sure you want to delete "${config.provider}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (isConfirmed) {
    await deleteConfigApi({ id: config.id });

    if (deleteError.value) {
      return;
    }

    await fetchAiConfigs();

    toast.add({
      title: "Success",
      description: `AI configuration "${config.provider}" has been deleted successfully!`,
      color: "success",
    });

    // Reload AI configs in global state
    await fetchAiConfig();
  }
};

watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchAiConfigs();
  },
  { immediate: true }
);
</script>
