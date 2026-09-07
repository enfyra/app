<template>
  <div class="space-y-6">
    <FilterActiveSummary
      v-if="isMounted && !loading && hasActiveFilters(currentFilter)"
      :count="activeFilterCount"
      @clear="clearFilters"
    />

    <CommonResourceListFrame
      v-model:page="page"
      root-class=""
      :loading="showInitialLoading"
      :has-items="users.length > 0"
      loading-title="Loading users..."
      loading-description="Fetching user accounts"
      empty-title="No users found"
      empty-description="No user accounts have been created yet"
      empty-icon="lucide:users"
      :total="total"
      :items-per-page="limit"
      :pagination-loading="loading"
      :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
    >
        <CommonResourceListItem
          v-for="user in users"
          :key="user.id"
          :title="user.name || user.email || 'Unnamed User'"
          :description="user.email || 'No email'"
          icon="lucide:user"
          :icon-color="pageIconColor"
          :loading="usersRefreshing"
          :to="`/settings/users/${getId(user)}`"
          :stats="[
            {
              label: 'Roles',
              component: user.roles?.length ? 'UBadge' : null,
              props: user.roles?.length
                ? {
                    variant: 'soft',
                    color: 'primary',
                  }
                : undefined,
              value: user.roles?.map((role: any) => role.name).join(', ') || 'No roles',
            },
            {
              label: 'Joined',
              value: new Date(user.createdAt).toLocaleDateString(),
            },
          ]"
          :methods="hasPermission('/enfyra_user', 'DELETE') ? [
            {
              label: 'Delete',
              props: {
                icon: 'i-lucide-trash-2',
                variant: 'solid',
                color: 'error',
                size: 'sm',
              },
              disabled: user.isRootAdmin,
              onClick: (e?: Event) => {
                e?.stopPropagation();
                deleteUser(user);
              },
            }
          ] : []"
          :header-actions="getHeaderActions(user)"
        />
    </CommonResourceListFrame>

    <FilterDrawerLazy
      v-model="showFilterDrawer"
      :table-name="tableName"
      :current-filter="currentFilter"
      @apply="handleFilterApply"
    />
  </div>
</template>
<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
const page = ref(1);
const limit = 10;
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
  "avatar",
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

const pageIconColor = 'primary';

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
  isRefreshing: usersRefreshing,
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

function getHeaderActions(user: any) {
  const actions = [];

  if (user.avatar) {
    actions.push({
      component: "UAvatar",
      props: {
        src: user.avatar,
        alt: user.name,
        size: "xs",
      },
    });
  } else {
    actions.push({
      component: "UAvatar",
      props: {
        alt: user.name,
        size: "xs",
      },
      label: user.email?.charAt(0)?.toUpperCase() || "?",
    });
  }

  return actions;
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

watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchUsers();
  },
  { immediate: true }
);
</script>
