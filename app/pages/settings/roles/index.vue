<script setup lang="ts">
const toast = useToast();
const page = ref(1);
const pageLimit = 10;
const route = useRoute();
const tableName = "role_definition";
const { confirm } = useConfirm();
const { getIncludeFields } = useSchema(tableName);
const { getId } = useDatabase();

const { isMounted } = useMounted();
const { isTablet } = useScreen();

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Role Manager",
  variant: "default",
  gradient: "purple",
});

// Fixed color for security/permissions
const pageIconColor = 'warning';

const {
  data: apiData,
  pending: loading,
  execute: fetchRoles,
} = useApi(() => "/role_definition", {
  query: computed(() => ({
    fields: getIncludeFields(),
    sort: "-createdAt",
    meta: "*",
    page: page.value,
    limit: pageLimit,
  })),
  errorContext: "Fetch Roles",
});

const roles = computed(() => apiData.value?.data || []);
const total = computed(() => {
  return apiData.value?.meta?.totalCount || 0;
});

useHeaderActionRegistry({
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
        route: "/role_definition",
        actions: ["create"],
      },
    ],
  },
});

const { execute: deleteRoleApi, error: deleteError } = useApi(
  () => `/role_definition`,
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

  toast.add({ 
    title: "Success",
    description: "Role deleted successfully", 
    color: "success" 
  });
  await fetchRoles();
}

watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchRoles();
  },
  { immediate: true }
);
</script>

<template>
  <div class="space-y-6">
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="!isMounted || loading"
        title="Loading roles..."
        description="Fetching role definitions"
        size="sm"
        type="card"
        context="page"
      />

      <div
        v-else-if="roles.length"
        class="grid gap-4"
        :class="
          isTablet ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3'
        "
      >
        <CommonSettingsCard
          v-for="role in roles"
          :key="role.id"
          :title="role.name"
          :description="role.description || 'No description'"
          icon="lucide:shield-check"
          :icon-color="pageIconColor"
          :card-class="'cursor-pointer transition-all'"
          @click="navigateTo(`/settings/roles/${getId(role)}`)"
          :stats="[
            {
              label: 'Created',
              value: new Date(role.createdAt).toLocaleDateString(),
            },
            {
              label: 'System',
              component: role.isSystem ? 'UBadge' : undefined,
              props: role.isSystem ? { variant: 'soft', color: 'info' } : undefined,
              value: role.isSystem ? 'System' : '-'
            },
            {
              label: 'Users',
              value: '-'
            }
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
              disabled: role.isSystem,
              onClick: (e?: Event) => {
                e?.stopPropagation();
                deleteRole(getId(role));
              },
            }
          ]"
        />
      </div>

      <CommonEmptyState
        v-else
        title="No roles found"
        description="No role definitions have been created yet"
        icon="lucide:shield-check"
        size="sm"
      />
    </Transition>

    <!-- Premium Pagination -->
    <div
      v-if="!loading && roles.length > 0 && total > pageLimit"
      class="flex items-center justify-between mt-6"
    >
      <UPagination
        v-model:page="page"
        :items-per-page="pageLimit"
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
        Showing <span class="text-gray-700 dark:text-gray-200">{{ (page - 1) * pageLimit + 1 }}-{{ Math.min(page * pageLimit, total) }}</span> of <span class="text-gray-700 dark:text-gray-200">{{ total }}</span> results
      </p>
    </div>
  </div>
</template>
