<script setup lang="ts">
import { h } from 'vue';
import { UBadge } from '#components';
import type { ColumnDef } from '@tanstack/vue-table';
import type { DataTableRowAction } from '~/types/data-table-columns';
import { settingsDateColumn, settingsTextColumn } from '~/utils/settings-table';

const { register: registerHeaderActions } = useHeaderActionRegistry();
const notify = useNotify();
const page = ref(1);
const pageLimit = useSettingsPageSize('bootstrap');
const route = useRoute();
const tableName = "enfyra_bootstrap_script";
const { confirm } = useConfirm();
const { getId } = useDatabase();
const BOOTSTRAP_LIST_FIELDS = [
  "id",
  "name",
  "description",
  "type",
  "isSystem",
  "createdAt",
].join(",");

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Bootstrap Manager",
  gradient: "purple",
});

const {
  data: apiData,
  pending: loading,
  execute: fetchBootstrapScripts,
} = useApi(() => "/enfyra_bootstrap_script", {
  query: computed(() => ({
    fields: BOOTSTRAP_LIST_FIELDS,
    sort: "-createdAt",
    meta: "*",
    page: page.value,
    limit: pageLimit,
  })),
  errorContext: "Fetch Bootstrap Scripts",
});

const { execute: removeScript, error: removeScriptError } = useApi(
  () => `/enfyra_bootstrap_script`,
  {
    method: "delete",
    errorContext: "Delete Script",
  }
);

const {
  items: bootstrapScripts,
  showInitialLoading,
} = useStableListState(() => apiData.value?.data, () => loading.value);
const total = computed(() => {
  return apiData.value?.meta?.totalCount || 0;
});

registerHeaderActions({
  id: "create-bootstrap",
  label: "Create Bootstrap",
  icon: "lucide:plus",
  variant: "solid",
  color: "primary",
  size: "md",
  to: "/settings/bootstrap/create",
  permission: {
    and: [
      {
        route: "/enfyra_bootstrap_script",
        methods: ["POST"],
      },
    ],
  },
});

async function deleteScript(id: number) {
  const ok = await confirm({
    title: "Are you sure?",
  });
  if (!ok) return;

  await removeScript({ id });

  if (removeScriptError.value) {
    return;
  }

  notify.success("Success", "Bootstrap script deleted successfully");
  await fetchBootstrapScripts();
}

const columns: ColumnDef<Record<string, any>>[] = [
  settingsTextColumn('name', 'Script'),
  settingsTextColumn('description', 'Description'),
  settingsTextColumn('type', 'Type'),
  { accessorKey: 'isSystem', header: 'Origin', enableSorting: false,
    cell: ({ getValue }) => h(UBadge, { label: getValue() ? 'System' : 'Custom', color: getValue() ? 'info' : 'neutral', variant: 'soft' }),
  },
  settingsDateColumn(),
];

function getRowActions(script: Record<string, any>): DataTableRowAction[] {
  if (script.isSystem) return [];
  return [{ label: 'Delete', icon: 'lucide:trash-2', color: 'error', onSelect: () => deleteScript(getId(script)) }];
}

async function setPageSize(size: number) {
  if (page.value !== 1) await navigateTo({ path: route.path, query: { ...route.query, page: undefined } }, { replace: true });
  pageLimit.value = size;
}

watch(() => route.query.page, newVal => { page.value = Math.max(1, Number(newVal) || 1); }, { immediate: true });
watch([page, pageLimit], () => { void fetchBootstrapScripts(); }, { immediate: true });
</script>

<template>
  <DataTableSettingsTable
    v-model:page="page"
    :data="bootstrapScripts"
    :columns="columns"
    :actions="getRowActions"
    :loading="showInitialLoading"
    :total="total"
    :page-limit="pageLimit"
    page-size-key="bootstrap"
    :pagination-loading="loading"
    @page-size-change="setPageSize"
    :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
    @row-click="script => navigateTo(`/settings/bootstrap/${getId(script)}`)"
  />
</template>
