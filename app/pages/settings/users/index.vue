<template>
  <div class="space-y-6">
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="!isMounted || loading"
        title="Loading users..."
        description="Fetching user accounts"
        size="sm"
        type="card"
        context="page"
      />

      <div
        v-else-if="users.length > 0"
        class="grid gap-4"
        :class="
          isTablet ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3'
        "
      >
        <CommonSettingsCard
          v-for="user in users"
          :key="user.id"
          :title="user.name || user.email || 'Unnamed User'"
          :description="user.email || 'No email'"
          icon="lucide:user"
          :icon-color="pageIconColor"
          :card-class="'cursor-pointer transition-all'"
          @click="navigateTo(`/settings/users/${getId(user)}`)"
          :stats="[
            {
              label: 'Role',
              component: user.role ? 'UBadge' : null,
              props: user.role
                ? {
                    variant: 'soft',
                    color: 'primary',
                  }
                : undefined,
              value: user.role?.name || 'No role',
            },
            {
              label: 'Joined',
              value: new Date(user.createdAt).toLocaleDateString(),
            },
          ]"
          :actions="[
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
          ]"
          :header-actions="getHeaderActions(user)"
        />
      </div>

      <CommonEmptyState
        v-else
        title="No users found"
        description="No user accounts have been created yet"
        icon="lucide:users"
        size="sm"
      />
      
    </Transition>
    <div
      v-if="!loading && users.length > 0 && total > limit"
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
        Showing <span class="text-gray-700 dark:text-gray-200">{{ (page - 1) * limit + 1 }}-{{ Math.min(page * limit, total) }}</span> of <span class="text-gray-700 dark:text-gray-200">{{ total }}</span> results
      </p>
    </div>
  

    <FilterDrawerLazy
      v-model="showFilterDrawer"
      :table-name="tableName"
      :current-filter="currentFilter"
      @apply="handleFilterApply"
    />
  </div>
</template>
<script setup lang="ts">
const page = ref(1);
const limit = 9;
const tableName = "user_definition";
const { confirm } = useConfirm();
const { getIncludeFields } = useSchema(tableName);
const { createEmptyFilter, buildQuery, hasActiveFilters } = useFilterQuery();
const route = useRoute();
const router = useRouter();
const { isMounted } = useMounted();
const { isTablet } = useScreen();
const { getId } = useDatabase();

const showFilterDrawer = ref(false);
const currentFilter = ref(createEmptyFilter());
const toast = useToast();

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "User Manager",
  variant: "default",
  gradient: "blue",
});

// Fixed color for user management
const pageIconColor = 'warning';

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
      fields: getIncludeFields(),
      meta: "*",
      ...(Object.keys(filterQuery).length > 0 && { filter: filterQuery }),
    };
  }),
  errorContext: "Fetch Users",
});

const users = computed(() => apiData.value?.data || []);
const total = computed(() => apiData.value?.meta?.totalCount || 0);

const filterLabel = computed(() => {
  const activeCount = currentFilter.value.conditions.length;
  return activeCount > 0 ? `Filters (${activeCount})` : "Filter";
});

const filterVariant = computed(() => {
  return hasActiveFilters(currentFilter.value) ? "solid" : "outline";
});

const filterColor = computed(() => {
  return hasActiveFilters(currentFilter.value) ? "secondary" : "neutral";
});

useHeaderActionRegistry([
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
          actions: ["read"],
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
          actions: ["create"],
        },
      ],
    },
  },
]);

// Handle filter apply from FilterDrawer
async function handleFilterApply(filter: FilterGroup) {
  currentFilter.value = filter;
  
  if (page.value === 1) {
    // Already on page 1 → fetch directly
    await fetchUsers();
  } else {
    // On other page → go to page 1, watch will trigger
    const newQuery = { ...route.query };
    delete newQuery.page;
    
    await router.replace({
      query: newQuery,
    });
  }
}

function getHeaderActions(user: any) {
  const actions = [];

  // Avatar only
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
  // Protect rootAdmin from deletion
  if (user.isRootAdmin) {
    toast.add({
      title: "Error",
      description: "Cannot delete root administrator account",
      color: "error",
    });
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

    toast.add({
      title: "Success",
      description: `User "${
        user.name || user.email
      }" has been deleted successfully!`,
      color: "success",
    });
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
