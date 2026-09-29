<script setup lang="ts">
import { h } from 'vue';
import { UBadge } from '#components';
import type { ColumnDef } from '@tanstack/vue-table';
import type { DataTableRowAction } from '~/types/data-table-columns';
import { settingsDateColumn, settingsTextColumn } from '~/utils/settings-table';

const { register: registerHeaderActions } = useHeaderActionRegistry();
const notify = useNotify();
const page = ref(1);
const pageLimit = useSettingsPageSize('roles');
const route = useRoute();
const tableName = "enfyra_role";
const { confirm } = useConfirm();
const { getId } = useDatabase();
const ROLE_LIST_FIELDS = [
  "id",
  "name",
  "description",
  "isSystem",
  "createdAt",
].join(",");

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Role Manager",
  variant: "default",
  gradient: "purple",
});

const {
  data: apiData,
  pending: loading,
  execute: fetchRoles,
} = useApi(() => "/enfyra_role", {
  query: computed(() => ({
    fields: ROLE_LIST_FIELDS,
    sort: "-createdAt",
    meta: "*",
    page: page.value,
    limit: pageLimit,
  })),
  errorContext: "Fetch Roles",
});

const {
  items: roles,
  showInitialLoading,
} = useStableListState(() => apiData.value?.data, () => loading.value);
const total = computed(() => {
  return apiData.value?.meta?.totalCount || 0;
});

registerHeaderActions({
  id: "create-role",
  label: "Create Role",
  icon: "lucide:plus",
  variant: "solid",
  color: "primary",
  size: "md",
  to: "/settings/roles/create",
  permission: {
    and: [
      {
        route: "/enfyra_role",
        methods: ["POST"],
      },
    ],
  },
});

const { execute: deleteRoleApi, error: deleteError } = useApi(
  () => `/enfyra_role`,
  {
    method: "delete",
    errorContext: "Delete Role",
  }
);

async function deleteRole(id: string) {
  const ok = await confirm({
    title: "Are you sure?",
    content: "You cannot go back",
  });
  if (!ok) return;

  await deleteRoleApi({ id });

  if (deleteError.value) {
    return;
  }

  notify.success("Success", "Role deleted successfully");
  await fetchRoles();
}

const columns: ColumnDef<Record<string, any>>[] = [
  settingsTextColumn('name', 'Role'),
  settingsTextColumn('description', 'Description'),
  { accessorKey: 'isSystem', header: 'Origin', enableSorting: false,
    cell: ({ getValue }) => h(UBadge, { label: getValue() ? 'System' : 'Custom', color: getValue() ? 'info' : 'neutral', variant: 'soft' }),
  },
  settingsDateColumn(),
];

function getRowActions(role: Record<string, any>): DataTableRowAction[] {
  if (role.isSystem) return [];
  return [{ label: 'Delete', icon: 'lucide:trash-2', color: 'error', onSelect: () => deleteRole(getId(role)) }];
}

async function setPageSize(size: number) {
  if (page.value !== 1) await navigateTo({ path: route.path, query: { ...route.query, page: undefined } }, { replace: true });
  pageLimit.value = size;
}

watch(() => route.query.page, newVal => { page.value = Math.max(1, Number(newVal) || 1); }, { immediate: true });
watch([page, pageLimit], () => { void fetchRoles(); }, { immediate: true });
</script>

<template>
  <DataTableSettingsTable
    v-model:page="page"
    :data="roles"
    :columns="columns"
    :actions="getRowActions"
    :loading="showInitialLoading"
    :total="total"
    :page-limit="pageLimit"
    page-size-key="roles"
    :pagination-loading="loading"
    @page-size-change="setPageSize"
    :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
    @row-click="role => navigateTo(`/settings/roles/${getId(role)}`)"
  />
</template>
