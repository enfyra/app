<template>
  <div class="space-y-6">
    <FilterActiveSummary
      v-if="isMounted && !loading && hasActiveFilters(currentFilter)"
      :count="activeFilterCount"
      @clear="clearFilters"
    />

    <DataTableSettingsTable
      v-model:page="page"
      :data="users"
      :columns="columns"
      :actions="getRowActions"
      :loading="showInitialLoading"
      :total="total"
      :page-limit="limit"
      page-size-key="users"
      :pagination-loading="loading"
      @page-size-change="setPageSize"
      :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
      @row-click="user => navigateTo(`/settings/users/${getId(user)}`)"
    />

    <FilterDrawerLazy
      v-model="showFilterDrawer"
      :table-name="tableName"
      :current-filter="currentFilter"
      @apply="handleFilterApply"
    />
  </div>
</template>
<script setup lang="ts">
import { h } from 'vue';
import { UBadge } from '#components';
import type { ColumnDef } from '@tanstack/vue-table';
import type { DataTableRowAction } from '~/types/data-table-columns';
import { settingsDateColumn, settingsTextColumn } from '~/utils/settings-table';

const { register: registerHeaderActions } = useHeaderActionRegistry();
const page = ref(1);
const limit = useSettingsPageSize('users');
const tableName = "enfyra_user";
const { confirm } = useConfirm();
const { createEmptyFilter, buildQuery, hasActiveFilters, countActiveFilters } = useFilterQuery();
const route = useRoute();
const router = useRouter();
const { isMounted } = useMounted();
const { getId } = useDatabase();
const { hasPermission } = usePermissions();

const showFilterDrawer = ref(false);
const currentFilter = ref(createEmptyFilter());
const activeFilterCount = computed(() => countActiveFilters(currentFilter.value));
const notify = useNotify();
const USER_LIST_FIELDS = [
  "id",
  "name",
  "email",
  "isRootAdmin",
  "createdAt",
  "roles.id",
  "roles.name",
].join(",");

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "User Manager",
  variant: "default",
  gradient: "blue",
});

const {
  data: apiData,
  pending: loading,
  execute: fetchUsers,
} = useApi(() => `/${tableName}`, {
  query: computed(() => {
    const filterQuery = hasActiveFilters(currentFilter.value)
      ? buildQuery(currentFilter.value)
      : {};

    return {
      limit,
      page: page.value,
      fields: USER_LIST_FIELDS,
      sort: "-createdAt",
      meta: "*",
      ...(Object.keys(filterQuery).length > 0 && { filter: filterQuery }),
    };
  }),
  errorContext: "Fetch Users",
});

const {
  items: users,
  showInitialLoading,
} = useStableListState(() => apiData.value?.data, () => loading.value);
const total = computed(() =>
  hasActiveFilters(currentFilter.value)
    ? apiData.value?.meta?.filterCount || 0
    : apiData.value?.meta?.totalCount || 0,
);

const filterLabel = computed(() => {
  const activeCount = activeFilterCount.value;
  return activeCount > 0 ? `Filters (${activeCount})` : "Filter";
});

const filterVariant = computed(() => {
  return hasActiveFilters(currentFilter.value) ? "solid" : "outline";
});

const filterColor = computed(() => {
  return hasActiveFilters(currentFilter.value) ? "secondary" : "neutral";
});

registerHeaderActions([
  {
    id: "filter-users",
    get label() {
      return filterLabel.value;
    },
    icon: "lucide:filter",
    get variant() {
      return filterVariant.value;
    },
    get color() {
      return filterColor.value;
    },
    size: "md",
    onClick: () => {
      showFilterDrawer.value = true;
    },
    permission: {
      and: [
        {
          route: `/${tableName}`,
          methods: ["GET"],
        },
      ],
    },
  },
  {
    id: "create-user",
    label: "Create User",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
    to: "/settings/users/create",
    permission: {
      and: [
        {
          route: `/${tableName}`,
          methods: ["POST"],
        },
      ],
    },
  },
]);

async function handleFilterApply(filter: FilterGroup) {
  currentFilter.value = filter;
  
  if (page.value === 1) {
    
    await fetchUsers();
  } else {
    
    const newQuery = { ...route.query };
    delete newQuery.page;
    
    await router.replace({
      query: newQuery,
    });
  }
}

async function clearFilters() {
  await handleFilterApply(createEmptyFilter());
}

const columns: ColumnDef<Record<string, any>>[] = [
  { id: 'user', header: 'User', enableSorting: false,
    cell: ({ row }) => {
      const label = row.original.name || row.original.email || 'Unnamed User';
      return h('span', { class: 'block truncate', title: label }, label);
    },
  },
  settingsTextColumn('email', 'Email'),
  { id: 'roles', header: 'Roles', enableSorting: false,
    cell: ({ row }) => row.original.roles?.length
      ? h(UBadge, { label: row.original.roles.map((role: any) => role.name).join(', '), color: 'primary', variant: 'soft' })
      : 'No roles',
  },
  settingsDateColumn('createdAt', 'Joined'),
];

function getRowActions(user: Record<string, any>): DataTableRowAction[] {
  if (!hasPermission('/enfyra_user', 'DELETE') || user.isRootAdmin) return [];
  return [{ label: 'Delete', icon: 'lucide:trash-2', color: 'error', onSelect: () => deleteUser(user) }];
}

async function deleteUser(user: any) {
  
  if (user.isRootAdmin) {
    notify.error("Error", "Cannot delete root administrator account");
    return;
  }

  const isConfirmed = await confirm({
    title: "Delete User",
    content: `Are you sure you want to delete user "${
      user.name || user.email
    }"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (isConfirmed) {
    const { execute: deleteUserApi, error: deleteError } = useApi(
      () => `/${tableName}/${getId(user)}`,
      {
        method: "delete",
        errorContext: "Delete User",
      }
    );

    await deleteUserApi();

    if (deleteError.value) {
      return;
    }

    await fetchUsers();

    notify.success("Success", `User "${
        user.name || user.email
      }" has been deleted successfully!`);
  }
}

async function setPageSize(size: number) {
  if (page.value !== 1) {
    await router.replace({ query: { ...route.query, page: undefined } });
    limit.value = size;
  } else {
    limit.value = size;
  }
}

watch(() => route.query.page, newVal => {
  page.value = Math.max(1, Number(newVal) || 1);
}, { immediate: true });
watch([page, limit], () => { void fetchUsers(); }, { immediate: true });
</script>
