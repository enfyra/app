<template>
  <DataTableSettingsTable
    v-model:page="page"
    :data="flows"
    :columns="columns"
    :actions="getRowActions"
    :loading="showInitialLoading"
    :total="total"
    :page-limit="limit"
    page-size-key="flows"
    :pagination-loading="loading"
    @page-size-change="setPageSize"
    :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
    @row-click="flow => navigateTo(`/settings/flows/${getId(flow)}`)"
  />
</template>

<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
import { settingsStatusColumn, settingsTextColumn } from '~/utils/settings-table';
import type { ColumnDef } from '@tanstack/vue-table';
import type { DataTableRowAction } from '~/types/data-table-columns';

const page = ref(1);
const limit = useSettingsPageSize('flows');
const FLOW_LIST_FIELDS = [
  "id",
  "name",
  "description",
  "icon",
  "isEnabled",
  "isSystem",
  "timeout",
  "steps.id",
  "triggers.id",
  "triggers.type",
  "triggers.isEnabled",
].join(",");

const notify = useNotify();
const { confirm } = useConfirm();
const { getLoader: getFlowLoader } = useKeyedLoaders();
const { checkPermissionCondition } = usePermissions();
const { getId } = useDatabase();
const route = useRoute();
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Flow Manager",
  gradient: "purple",
});

const {
  data: apiData,
  pending: loading,
  execute: fetchFlows,
} = useApi(() => "/enfyra_flow", {
  query: computed(() => ({
    fields: FLOW_LIST_FIELDS,
    limit,
    page: page.value,
    meta: "*",
    sort: ["id"].join(","),
  })),
  errorContext: "Fetch Flows",
});

const {
  items: flows,
  showInitialLoading,
} = useStableListState(() => apiData.value?.data, () => loading.value);
const total = computed(() => apiData.value?.meta?.totalCount || 0);

const { execute: updateFlow, error: updateError } = useApi(
  () => `/enfyra_flow`,
  { method: "patch", errorContext: "Update Flow" }
);

registerHeaderActions([
  {
    id: "create-flow",
    label: "Create Flow",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
    to: "/settings/flows/create",
    permission: {
      and: [{ route: "/enfyra_flow", methods: ["POST"] }],
    },
  },
]);


const columns: ColumnDef<Record<string, any>>[] = [
  settingsTextColumn('name', 'Flow'),
  { ...settingsTextColumn('description', 'Description'), meta: { style: { th: { width: '38%' }, td: { width: '38%' } } } },
  { id: 'triggers', header: 'Triggers', enableSorting: false,
    cell: ({ row }) => (row.original.triggers || []).filter((trigger: any) => trigger.isEnabled).map((trigger: any) => trigger.type).join(', ') || 'code',
  },
  { id: 'steps', header: 'Steps', enableSorting: false, cell: ({ row }) => String(row.original.steps?.length || 0) },
  { id: 'timeout', header: 'Timeout', enableSorting: false, cell: ({ row }) => `${(row.original.timeout || 30000) / 1000}s` },
  settingsStatusColumn(),
];

function getRowActions(flow: Record<string, any>): DataTableRowAction[] {
  return [
    ...(checkPermissionCondition({ or: [{ route: '/enfyra_flow', methods: ['PATCH'] }] }) ? [{
      label: flow.isEnabled ? 'Disable' : 'Enable', icon: flow.isEnabled ? 'lucide:power-off' : 'lucide:power',
      disabled: getFlowLoader(String(getId(flow))).isLoading.value,
      onSelect: () => toggleFlowStatus(flow),
    }] : []),
    ...(checkPermissionCondition({ or: [{ route: '/enfyra_flow', methods: ['DELETE'] }] }) && !flow.isSystem ? [{
      label: 'Delete', icon: 'lucide:trash-2', color: 'error', onSelect: () => deleteFlow(flow),
    }] : []),
  ];
}

const toggleFlowStatus = async (flow: any) => {
  const loader = getFlowLoader(flow.id.toString());
  const newStatus = !flow.isEnabled;

  if (apiData.value?.data) {
    const idx = apiData.value.data.findIndex((f: any) => f.id === flow.id);
    if (idx !== -1) apiData.value.data[idx].isEnabled = newStatus;
  }

  await loader.withLoading(() => updateFlow({ body: { isEnabled: newStatus }, id: flow.id }));

  if (updateError.value) {
    if (apiData.value?.data) {
      const idx = apiData.value.data.findIndex((f: any) => f.id === flow.id);
      if (idx !== -1) apiData.value.data[idx].isEnabled = !newStatus;
    }
    return;
  }

  notify.success("Success", `Flow "${flow.name}" has been ${newStatus ? "activated" : "deactivated"} successfully!`);
};

const { execute: deleteFlowApi, error: deleteError } = useApi(
  () => `/enfyra_flow`,
  { method: "delete", errorContext: "Delete Flow" }
);

const deleteFlow = async (flow: any) => {
  const isConfirmed = await confirm({
    title: "Delete Flow",
    content: `Are you sure you want to delete "${flow.name}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (isConfirmed) {
    await deleteFlowApi({ id: flow.id });
    if (deleteError.value) return;
    await fetchFlows();
    notify.success("Success", `Flow "${flow.name}" has been deleted successfully!`);
  }
};

async function setPageSize(size: number) {
  if (page.value !== 1) await navigateTo({ path: route.path, query: { ...route.query, page: undefined } }, { replace: true });
  limit.value = size;
}

watch(() => route.query.page, newVal => { page.value = Math.max(1, Number(newVal) || 1); }, { immediate: true });
watch([page, limit], () => { void fetchFlows(); }, { immediate: true });
</script>
