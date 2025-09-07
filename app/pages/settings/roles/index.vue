<script setup lang="ts">
// useEnfyraApi is auto-imported in Nuxt
const toast = useToast();
const page = ref(1);
const pageLimit = 10;
const route = useRoute();
const tableName = "role_definition";
const { confirm } = useConfirm();
const { getIncludeFields } = useSchema(tableName);

const { isMounted } = useMounted();
const { isTablet } = useScreen();

const {
  data: apiData,
  pending: loading,
  execute: fetchRoles,
} = useEnfyraApi(() => "/role_definition", {
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

const { execute: deleteRoleApi, error: deleteError } = useEnfyraApi(
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
    <!-- Header -->
    <CommonPageHeader
      title="Role Manager"
      title-size="md"
      show-background
      background-gradient="from-amber-500/8 via-orange-400/5 to-transparent"
      padding-y="py-6"
    />
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
          isTablet ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        "
      >
        <CommonSettingsCard
          v-for="role in roles"
          :key="role.id"
          :title="role.name"
          :description="role.description || 'No description'"
          icon="lucide:shield-check"
          icon-color="primary"
          :card-class="'cursor-pointer lg:hover:ring-2 lg:hover:ring-primary/20 transition-all'"
          @click="navigateTo(`/settings/roles/${role.id}`)"
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
          :actions="[]"
          :header-actions="!role.isSystem ? [{
            component: 'UButton',
            props: {
              icon: 'i-heroicons-trash',
              variant: 'outline',
              color: 'error'
            },
            onClick: (e?: Event) => {
              e?.stopPropagation();
              deleteRole(role.id);
            }
          }] : []"
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

    <div class="flex justify-center" v-if="!loading && roles.length > 0">
      <UPagination
        v-if="total > pageLimit"
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
        color="secondary"
        active-color="secondary"
      />
    </div>
  </div>
</template>
