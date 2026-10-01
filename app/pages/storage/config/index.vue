<template>
  <DataTableSettingsTable
    v-model:page="page"
    :data="storageConfigs"
    :columns="columns"
    :actions="getRowActions"
    :loading="showInitialLoading || storageConfigsRefreshing"
    :total="total"
    :page-limit="limit"
    page-size-key="storage-config"
    :pagination-loading="loading"
    :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
    @page-size-change="setPageSize"
    @row-click="config => navigateTo(`/storage/config/${getId(config)}`)"
  >
    <template #empty>
      <CommonEmptyState variant="naked" title="No storage configurations found" description="No storage configurations have been created yet" icon="lucide:hard-drive" size="sm" />
    </template>
  </DataTableSettingsTable>
</template>

<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table';
import type { DataTableRowAction } from '~/types/data-table-columns';
import { settingsStatusColumn, settingsTextColumn } from '~/utils/settings-table';
const { register: registerHeaderActions } = useHeaderActionRegistry();

const page = ref(1);
const limit = useSettingsPageSize('storage-config');

const notify = useNotify();
const { confirm } = useConfirm();
const { getLoader: getConfigLoader } = useKeyedLoaders();
const { checkPermissionCondition } = usePermissions();
const { getId } = useDatabase();
const { fetchStorageConfigs: fetchGlobalStorageConfigs } = useGlobalState();

const route = useRoute();
const router = useRouter();
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
    limit: limit.value,
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

const columns: ColumnDef<Record<string, any>>[] = [
  settingsTextColumn('name', 'Name'),
  settingsTextColumn('description', 'Description'),
  { id: 'type', header: 'Type', enableSorting: false, accessorFn: config => config.type || config.driver || 'Local Storage' },
  settingsStatusColumn(),
];

async function setPageSize(size: number) {
  if (page.value !== 1) await router.replace({ query: { ...route.query, page: undefined } });
  limit.value = size;
}

function isConfigLoading(config: any) {
  return getConfigLoader(String(getId(config))).isLoading.value;
}

function getRowActions(config: Record<string, any>): DataTableRowAction[] {
  const actions: DataTableRowAction[] = [];
  if (checkPermissionCondition({ or: [{ route: '/enfyra_storage_config', methods: ['PATCH'] }] })) {
    actions.push({ label: config.isEnabled ? 'Disable' : 'Enable', icon: 'lucide:power', disabled: isConfigLoading(config), onSelect: () => toggleConfigStatus(config) });
  }
  if (checkPermissionCondition({ or: [{ route: '/enfyra_storage_config', methods: ['DELETE'] }] })) {
    actions.push({ label: 'Delete', icon: 'lucide:trash-2', color: 'error', disabled: isConfigLoading(config), onSelect: () => deleteConfig(config) });
  }
  return actions;
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
  () => [route.query.page, limit.value],
  async ([newVal]) => {
    page.value = Math.max(1, Number(newVal) || 1);
    await fetchStorageConfigs();
  },
  { immediate: true }
);
</script>
