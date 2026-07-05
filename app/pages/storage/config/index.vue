<template>
  <CommonResourceListFrame
    v-model:page="page"
    root-class="storage-config-page"
    :loading="showInitialLoading"
    :has-items="storageConfigs.length > 0"
    empty-title="No storage configurations found"
    empty-description="No storage configurations have been created yet"
    empty-icon="lucide:hard-drive"
    empty-size="lg"
    :total="total"
    :items-per-page="limit"
    :pagination-loading="loading"
    :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
    :pagination-ui="{ item: 'h-9 w-9 rounded-xl transition-all duration-300' }"
  >
    <template #skeleton-row>
      <CommonResourceListSkeletonRow
        title-width="w-44"
        description-width="w-1/2 max-w-[28rem]"
        :chips="['w-24', 'w-20']"
        trailing-width="w-32"
      />
    </template>

    <CommonResourceListItem
      v-for="config in storageConfigs"
      :key="getId(config)"
      :title="config.name"
      :description="config.description || 'No description provided'"
      :icon="getStorageIcon(config)"
      icon-color="primary"
      :content-loading="storageConfigsRefreshing"
      :stats="[
        {
          label: 'Type',
          component: 'UBadge',
          props: { variant: 'soft', color: getStorageBadgeColor(config) },
          value: config.type || config.driver || 'Local Storage',
        },
        {
          label: 'Status',
          component: 'UBadge',
          props: { variant: 'soft', color: config.isEnabled ? 'success' : 'neutral' },
          value: config.isEnabled ? 'Active' : 'Inactive',
        },
      ]"
      :header-actions="getHeaderActions(config)"
      :actions="getActions(config)"
      @click="navigateToDetail(config)"
    >
      <template #skeleton-content>
        <span class="block h-4 w-44 rounded skeleton-gradient skeleton-pulse-slow" />
        <span class="block h-3 w-1/2 max-w-[28rem] rounded skeleton-inline skeleton-pulse-slow" />
        <span class="flex flex-wrap gap-2">
          <span class="block h-5 w-24 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
          <span class="block h-5 w-20 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
        </span>
      </template>

      <template #skeleton-actions>
        <span class="hidden h-7 w-10 flex-shrink-0 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow md:block" />
        <span class="hidden h-8 w-20 flex-shrink-0 rounded-[var(--radius-control)] skeleton-inline skeleton-pulse-slow md:block" />
      </template>
    </CommonResourceListItem>
  </CommonResourceListFrame>
</template>

<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();

const page = ref(1);
const limit = 9;

const notify = useNotify();
const { confirm } = useConfirm();
const { getLoader: getConfigLoader } = useKeyedLoaders();
const { checkPermissionCondition } = usePermissions();
const { getId } = useDatabase();
const { fetchStorageConfigs: fetchGlobalStorageConfigs } = useGlobalState();

const route = useRoute();
const { registerPageHeader } = usePageHeaderRegistry();
const STORAGE_CONFIG_LIST_FIELDS = [
  "id",
  "name",
  "description",
  "type",
  "driver",
  "isEnabled",
].join(",");

registerPageHeader({
  title: "Storage Configuration",
  gradient: "blue",
});

const {
  data: apiData,
  pending: loading,
  execute: fetchStorageConfigs,
} = useApi(() => "/enfyra_storage_config", {
  query: computed(() => ({
    fields: STORAGE_CONFIG_LIST_FIELDS,
    limit,
    page: page.value,
    meta: "*",
    sort: ["id"].join(","),
  })),
  errorContext: "Fetch Storage Configurations",
});

const {
  items: storageConfigs,
  showInitialLoading,
  isRefreshing: storageConfigsRefreshing,
} = useStableListState(() => apiData.value?.data, () => loading.value);
const total = computed(() => apiData.value?.meta?.totalCount || 0);


const { execute: updateConfig, error: updateError } = useApi(
  () => `/enfyra_storage_config`,
  {
    method: "patch",
    errorContext: "Update Storage Configuration",
  }
);

registerHeaderActions([
  {
    id: "create-storage-config",
    label: "Create Storage",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
    to: "/storage/config/create",
    permission: {
      and: [
        {
          route: "/enfyra_storage_config",
          methods: ["POST"],
        },
      ],
    },
  },
]);

function getStorageIcon(config: any) {
  const storageType = config.type || "Local Storage";
  const iconMap: Record<string, string> = {
    "Amazon S3": "lucide:cloud",
    "Google Cloud Storage": "lucide:cloud",
    "Cloudflare R2": "lucide:cloud",
    "Local Storage": "lucide:hard-drive",
  };
  return iconMap[storageType] || "lucide:database";
}

function getStorageBadgeColor(config: any) {
  const storageType = config.type || "Local Storage";
  const colorMap: Record<string, "primary" | "info" | "warning" | "neutral"> = {
    "Amazon S3": "primary",
    "Google Cloud Storage": "info",
    "Cloudflare R2": "warning",
    "Local Storage": "neutral",
  };
  return colorMap[storageType] || "neutral";
}

function navigateToDetail(config: any) {
  navigateTo(`/storage/config/${getId(config)}`);
}

function isConfigLoading(config: any) {
  return getConfigLoader(String(getId(config))).isLoading.value;
}

function getHeaderActions(config: any) {
  if (!checkPermissionCondition({ or: [{ route: "/enfyra_storage_config", methods: ["PATCH"] }] })) {
    return [];
  }

  return [
    {
      component: "USwitch",
      props: {
        "model-value": config.isEnabled,
        disabled: isConfigLoading(config),
      },
      onClick: (event?: Event) => event?.stopPropagation(),
      onUpdate: () => toggleConfigStatus(config),
    },
  ];
}

function getActions(config: any) {
  if (!checkPermissionCondition({ or: [{ route: "/enfyra_storage_config", methods: ["DELETE"] }] })) {
    return [];
  }

  return [
    {
      label: "Delete",
      props: {
        icon: "i-lucide-trash-2",
        variant: "ghost",
        color: "error",
        size: "xs",
      },
      onClick: () => {
        deleteConfig(config);
      },
    },
  ];
}

const toggleConfigStatus = async (config: any) => {
  const configId = getId(config);
  const loader = getConfigLoader(String(configId));
  const newStatus = !config.isEnabled;

  if (apiData.value?.data) {
    const configIndex = apiData.value.data.findIndex(
      (c: any) => getId(c) === configId
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
      id: configId,
    })
  );

  if (updateError.value) {
    if (apiData.value?.data) {
      const configIndex = apiData.value.data.findIndex(
        (c: any) => getId(c) === configId
      );
      if (configIndex !== -1) {
        apiData.value.data[configIndex].isEnabled = !newStatus;
      }
    }
    return;
  }

  await fetchGlobalStorageConfigs();

  notify.success("Success", `Storage configuration "${config.name}" has been ${
      newStatus ? "activated" : "deactivated"
    } successfully!`);
};

const { execute: deleteConfigApi, error: deleteError } = useApi(
  () => `/enfyra_storage_config`,
  {
    method: "delete",
    errorContext: "Delete Storage Configuration",
  }
);

const deleteConfig = async (config: any) => {
  const isConfirmed = await confirm({
    title: "Delete Storage Configuration",
    content: `Are you sure you want to delete "${config.name}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (isConfirmed) {
    await deleteConfigApi({ id: getId(config) });

    if (deleteError.value) {
      return;
    }

    await fetchStorageConfigs();

    await fetchGlobalStorageConfigs();

    notify.success("Success", `Storage configuration "${config.name}" has been deleted successfully!`);
  }
};

watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchStorageConfigs();
  },
  { immediate: true }
);
</script>
