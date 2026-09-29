<template>
  <DataTableSettingsTable
    v-model:page="page"
    :data="gateways"
    :columns="columns"
    :actions="getRowActions"
    :loading="showInitialLoading"
    :total="total"
    :page-limit="limit"
    page-size-key="websockets"
    :pagination-loading="loading"
    @page-size-change="setPageSize"
    :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
    @row-click="gateway => navigateTo(`/settings/websockets/${getId(gateway)}`)"
  />
</template>

<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
import { h } from 'vue';
import { UBadge } from '#components';
import type { ColumnDef } from '@tanstack/vue-table';
import type { DataTableRowAction } from '~/types/data-table-columns';
import { settingsStatusColumn, settingsTextColumn } from '~/utils/settings-table';

const page = ref(1);
const limit = useSettingsPageSize('websockets');
const WEBSOCKET_LIST_FIELDS = [
  "id",
  "path",
  "description",
  "isEnabled",
  "isSystem",
  "requireAuth",
  "events.id",
].join(",");

const notify = useNotify();
const { confirm } = useConfirm();
const { getLoader: getGatewayLoader } = useKeyedLoaders();
const { checkPermissionCondition } = usePermissions();
const { getId } = useDatabase();

const route = useRoute();
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "WebSocket Manager",
  gradient: "cyan",
});

const {
  data: apiData,
  pending: loading,
  execute: fetchGateways,
} = useApi(() => "/enfyra_websocket", {
  query: computed(() => ({
    fields: WEBSOCKET_LIST_FIELDS,
    limit,
    page: page.value,
    meta: "*",
    sort: ["id"].join(","),
  })),
  errorContext: "Fetch WebSocket Gateways",
});

const {
  items: gateways,
  showInitialLoading,
} = useStableListState(() => apiData.value?.data, () => loading.value);
const total = computed(() => apiData.value?.meta?.totalCount || 0);

const connectionCounts = ref<Record<string, number>>({});

const { execute: updateGateway, error: updateError } = useApi(
  () => `/enfyra_websocket`,
  {
    method: "patch",
    errorContext: "Update WebSocket Gateway",
  }
);

registerHeaderActions([
  {
    id: "create-websocket",
    label: "Create Gateway",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
    to: "/settings/websockets/create",
    permission: {
      and: [
        {
          route: "/enfyra_websocket",
          methods: ["POST"],
        },
      ],
    },
  },
]);

function getEventCount(gatewayId: string | number | null | undefined): number {
  if (gatewayId == null) return 0;
  const gateway = gateways.value.find((g: any) => getId(g) == gatewayId);
  return gateway?.events?.length || 0;
}

function getConnectionCount(gatewayId: string | number | null | undefined): number {
  if (gatewayId == null) return 0;
  return connectionCounts.value[gatewayId] || 0;
}

const columns: ColumnDef<Record<string, any>>[] = [
  settingsTextColumn('path', 'Gateway'),
  settingsTextColumn('description', 'Description'),
  { accessorKey: 'requireAuth', header: 'Auth', enableSorting: false,
    cell: ({ getValue }) => h(UBadge, { label: getValue() ? 'Required' : 'Public', color: getValue() ? 'warning' : 'neutral', variant: 'soft' }),
  },
  { id: 'events', header: 'Events', enableSorting: false, cell: ({ row }) => String(getEventCount(getId(row.original))) },
  { id: 'connections', header: 'Connections', enableSorting: false, cell: ({ row }) => String(getConnectionCount(getId(row.original))) },
  settingsStatusColumn(),
];

function getRowActions(gateway: Record<string, any>): DataTableRowAction[] {
  const id = getId(gateway);
  if (id == null) return [];
  return [
    ...(checkPermissionCondition({ or: [{ route: '/enfyra_websocket', methods: ['PATCH'] }] }) ? [{
      label: gateway.isEnabled ? 'Disable' : 'Enable', icon: gateway.isEnabled ? 'lucide:power-off' : 'lucide:power',
      disabled: getGatewayLoader(String(id)).isLoading.value,
      onSelect: () => toggleGatewayStatus(gateway),
    }] : []),
    ...(checkPermissionCondition({ or: [{ route: '/enfyra_websocket', methods: ['DELETE'] }] }) && !gateway.isSystem ? [{
      label: 'Delete', icon: 'lucide:trash-2', color: 'error', onSelect: () => deleteGateway(gateway),
    }] : []),
  ];
}

const toggleGatewayStatus = async (gateway: any) => {
  const id = getId(gateway);
  if (id == null) return;
  const loader = getGatewayLoader(String(id));
  const newStatus = !gateway.isEnabled;

  if (apiData.value?.data) {
    const gatewayIndex = apiData.value.data.findIndex(
      (g: any) => getId(g) === id
    );
    if (gatewayIndex !== -1) {
      apiData.value.data[gatewayIndex].isEnabled = newStatus;
    }
  }

  await loader.withLoading(() =>
    updateGateway({
      body: {
        isEnabled: newStatus,
      },
      id,
    })
  );

  if (updateError.value) {
    if (apiData.value?.data) {
      const gatewayIndex = apiData.value.data.findIndex(
        (g: any) => getId(g) === id
      );
      if (gatewayIndex !== -1) {
        apiData.value.data[gatewayIndex].isEnabled = !newStatus;
      }
    }
    return;
  }

  notify.success("Success", `WebSocket gateway "${gateway.path}" has been ${
      newStatus ? "activated" : "deactivated"
    } successfully!`);
};

const { execute: deleteGatewayApi, error: deleteError } = useApi(
  () => `/enfyra_websocket`,
  {
    method: "delete",
    errorContext: "Delete WebSocket Gateway",
  }
);

const deleteGateway = async (gateway: any) => {
  const isConfirmed = await confirm({
    title: "Delete WebSocket Gateway",
    content: `Are you sure you want to delete "${gateway.path}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (isConfirmed) {
    const id = getId(gateway);
    if (id == null) return;
    await deleteGatewayApi({ id });

    if (deleteError.value) {
      return;
    }

    await fetchGateways();

    notify.success("Success", `WebSocket gateway "${gateway.path}" has been deleted successfully!`);
  }
};

async function setPageSize(size: number) {
  if (page.value !== 1) await navigateTo({ path: route.path, query: { ...route.query, page: undefined } }, { replace: true });
  limit.value = size;
}

watch(() => route.query.page, newVal => { page.value = Math.max(1, Number(newVal) || 1); }, { immediate: true });
watch([page, limit], () => { void fetchGateways(); }, { immediate: true });
</script>
