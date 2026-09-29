<template>
  <DataTableSettingsTable
    v-model:page="page"
    :data="configs"
    :columns="columns"
    :actions="getRowActions"
    :loading="showInitialLoading"
    :total="total"
    :page-limit="limit"
    page-size-key="oauth-config"
    :pagination-loading="loading"
    @page-size-change="setPageSize"
    :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
    @row-click="config => navigateTo(`/settings/oauth/config/${getId(config)}`)"
  />
</template>

<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table';
import type { DataTableRowAction } from '~/types/data-table-columns';
import { settingsStatusColumn, settingsTextColumn } from '~/utils/settings-table';

const { register: registerHeaderActions } = useHeaderActionRegistry();
interface OAuthConfigDefinition {
  id?: string;
  _id?: string;
  provider: string;
  description?: string;
  clientId: string;
  isEnabled: boolean;
}

const page = ref(1);
const limit = useSettingsPageSize('oauth-config');

const notify = useNotify();
const { getLoader: getConfigLoader } = useKeyedLoaders();
const { checkPermissionCondition } = usePermissions();
const { getId } = useDatabase();

const route = useRoute();
const { registerPageHeader } = usePageHeaderRegistry();
const OAUTH_CONFIG_LIST_FIELDS = [
  "id",
  "provider",
  "description",
  "clientId",
  "isEnabled",
].join(",");

registerPageHeader({
  title: "OAuth Configuration",
  gradient: "blue",
});

const {
  data: apiData,
  pending: loading,
  execute: fetchConfigs,
} = useApi(() => "/enfyra_oauth_config", {
  query: computed(() => ({
    fields: OAUTH_CONFIG_LIST_FIELDS,
    limit,
    page: page.value,
    meta: "*",
    sort: ["provider"].join(","),
  })),
  errorContext: "Fetch OAuth Configs",
});

const {
  items: configs,
  showInitialLoading,
} = useStableListState(() => apiData.value?.data, () => loading.value);
const total = computed(() => apiData.value?.meta?.totalCount || 0);


const { execute: updateConfig, error: updateError } = useApi(
  () => `/enfyra_oauth_config`,
  {
    method: "patch",
    errorContext: "Update OAuth Config",
  }
);

registerHeaderActions([
  {
    id: "create-oauth-config",
    label: "Add Provider",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
    to: "/settings/oauth/config/create",
    permission: {
      and: [
        {
          route: "/enfyra_oauth_config",
          methods: ["POST"],
        },
      ],
    },
  },
]);

function getProviderLabel(provider: string) {
  switch (provider) {
    case "google":
      return "Google";
    case "facebook":
      return "Facebook";
    case "github":
      return "GitHub";
    default:
      return provider;
  }
}

function maskClientId(clientId: string) {
  if (!clientId || clientId.length < 10) return clientId;
  return clientId.substring(0, 8) + "..." + clientId.substring(clientId.length - 4);
}

const columns: ColumnDef<Record<string, any>>[] = [
  { accessorKey: 'provider', header: 'Provider', enableSorting: false, cell: ({ getValue }) => getProviderLabel(String(getValue())) },
  settingsTextColumn('description', 'Description'),
  { accessorKey: 'clientId', header: 'Client ID', enableSorting: false, cell: ({ getValue }) => maskClientId(String(getValue() ?? '')) },
  settingsStatusColumn(),
];

function getRowActions(config: Record<string, any>): DataTableRowAction[] {
  if (!checkPermissionCondition({ or: [{ route: '/enfyra_oauth_config', methods: ['PATCH'] }] })) return [];
  return [{
    label: config.isEnabled ? 'Disable' : 'Enable', icon: config.isEnabled ? 'lucide:power-off' : 'lucide:power',
    disabled: getConfigLoader(String(getId(config) ?? '')).isLoading.value,
    onSelect: () => toggleConfigStatus(config as OAuthConfigDefinition),
  }];
}

const toggleConfigStatus = async (config: OAuthConfigDefinition) => {
  const loader = getConfigLoader(String(getId(config) ?? ''));
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

  notify.success("Success", `${getProviderLabel(config.provider)} OAuth has been ${
      newStatus ? "enabled" : "disabled"
    } successfully!`);
};

async function setPageSize(size: number) {
  if (page.value !== 1) await navigateTo({ path: route.path, query: { ...route.query, page: undefined } }, { replace: true });
  limit.value = size;
}

watch(() => route.query.page, newVal => { page.value = Math.max(1, Number(newVal) || 1); }, { immediate: true });
watch([page, limit], () => { void fetchConfigs(); }, { immediate: true });
</script>
