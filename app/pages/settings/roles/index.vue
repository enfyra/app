<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
const notify = useNotify();
const page = ref(1);
const pageLimit = 10;
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

const pageIconColor = 'primary';

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
  isRefreshing: rolesRefreshing,
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
  <CommonResourceListFrame
    v-model:page="page"
    :loading="showInitialLoading"
    :has-items="roles.length > 0"
    loading-title="Loading roles..."
    loading-description="Fetching role definitions"
    empty-title="No roles found"
    empty-description="No role definitions have been created yet"
    empty-icon="lucide:shield-check"
    :total="total"
    :items-per-page="pageLimit"
    :pagination-loading="loading"
    :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
    :pagination-ui="{ item: 'h-9 w-9 rounded-xl transition-all duration-300' }"
  >
      <template #skeleton-row>
        <CommonResourceListSkeletonRow
          title-width="w-40"
          description-width="w-1/2 max-w-[28rem]"
          :chips="['w-24', 'w-16', 'w-14']"
          trailing-width="w-20"
        />
      </template>

      <CommonResourceListItem
        v-for="role in roles"
        :key="role.id"
        :title="role.name"
        :description="role.description || 'No description'"
        icon="lucide:shield-check"
        :icon-color="pageIconColor"
        :content-loading="rolesRefreshing"
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
        :methods="[
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
      >
        <template #skeleton-content>
          <span class="block h-4 w-40 rounded skeleton-gradient skeleton-pulse-slow" />
          <span class="block h-3 w-1/2 max-w-[28rem] rounded skeleton-inline skeleton-pulse-slow" />
          <span class="flex flex-wrap gap-2">
            <span class="block h-5 w-24 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
            <span class="block h-5 w-16 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
            <span class="hidden h-5 w-14 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow sm:block" />
          </span>
        </template>
        <template #skeleton-actions>
          <span class="hidden h-8 w-20 flex-shrink-0 rounded-[var(--radius-control)] skeleton-inline skeleton-pulse-slow md:block" />
        </template>
      </CommonResourceListItem>
  </CommonResourceListFrame>
</template>
