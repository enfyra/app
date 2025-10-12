<script setup lang="ts">
// useApi is auto-imported in Nuxt
const toast = useToast();
const { confirm } = useConfirm();
const { getId } = useDatabase();
const page = ref(1);
const pageLimit = 9;
const route = useRoute();
const tableName = "hook_definition";
const { getIncludeFields } = useSchema(tableName);

const { isMounted } = useMounted();
const { isTablet } = useScreen();

const {
  data: apiData,
  pending: loading,
  execute: fetchHooks,
} = useApi(() => "/hook_definition", {
  query: computed(() => ({
    fields: getIncludeFields(),
    sort: "-createdAt",
    meta: "*",
    page: page.value,
    limit: pageLimit,
  })),
  errorContext: "Fetch Hooks",
});

// Update API at setup level
const { execute: updateHookApi, error: updateError } = useApi(
  () => `/hook_definition`,
  {
    method: "patch",
    errorContext: "Toggle Hook",
  }
);

// Delete API at setup level
const { execute: deleteHookApi, error: deleteError } = useApi(
  () => `/hook_definition`,
  {
    method: "delete",
    errorContext: "Delete Hook",
  }
);

const hooks = computed(() => apiData.value?.data || []);
const total = computed(() => {
  return apiData.value?.meta?.totalCount || 0;
});

useHeaderActionRegistry({
  id: "create-hook",
  label: "Create Hook",
  icon: "lucide:plus",
  variant: "solid",
  color: "primary",
  size: "md",
  to: "/settings/hooks/create",
  permission: {
    and: [
      {
        route: "/hook_definition",
        actions: ["create"],
      },
    ],
  },
});

watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchHooks();
  },
  { immediate: true }
);

async function toggleEnabled(hook: any, value?: boolean) {
  const originalEnabled = hook.isEnabled;
  hook.isEnabled = value !== undefined ? value : !hook.isEnabled;

  await updateHookApi({ id: hook.id, body: { isEnabled: hook.isEnabled } });

  if (updateError.value) {
    hook.isEnabled = originalEnabled;
  }
}

async function deleteHook(hook: any) {
  const isConfirmed = await confirm({
    title: "Delete Hook",
    content: `Are you sure you want to delete hook "${
      hook.name || "Unnamed"
    }"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (isConfirmed) {
    await deleteHookApi({ id: getId(hook) });

    if (deleteError.value) {
      return;
    }

    await fetchHooks();

    toast.add({
      title: "Success",
      description: `Hook "${
        hook.name || "Unnamed"
      }" has been deleted successfully!`,
      color: "success",
    });
  }
}

</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <CommonPageHeader
      title="Hook Manager"
      title-size="md"
      show-background
      background-gradient="from-red-500/8 via-orange-400/5 to-transparent"
      padding-y="py-6"
    />
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="!isMounted || loading"
        title="Loading hooks..."
        description="Fetching webhook configurations"
        size="sm"
        type="card"
        context="page"
      />

      <div
        v-else-if="hooks.length"
        class="grid gap-4"
        :class="
          isTablet ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        "
      >
        <CommonSettingsCard
          v-for="hook in hooks"
          :key="hook.id"
          :title="hook.name || 'Unnamed'"
          :description="hook.description || 'No description'"
          icon="lucide:link"
          icon-color="primary"
          :card-class="'cursor-pointer lg:hover:ring-2 lg:hover:ring-primary/20 transition-all'"
          @click="navigateTo(`/settings/hooks/${getId(hook)}`)"
          :stats="[
            {
              label: 'Route',
              value: hook.route?.path || 'N/A',
            },
            {
              label: 'Status',
              component: 'UBadge',
              props: {
                variant: 'soft',
                color: hook.isEnabled ? 'success' : 'neutral',
              },
              value: hook.isEnabled ? 'Active' : 'Inactive',
            },
            ...(hook.isSystem
              ? [
                  {
                    label: 'System',
                    component: 'UBadge',
                    props: { variant: 'soft', color: 'info' },
                    value: 'System',
                  },
                ]
              : []),
          ]"
          :actions="[]"
          :header-actions="!hook.isSystem ? [
            {
              component: 'USwitch',
              props: {
                modelValue: hook.isEnabled,
                onClick: (e: Event) => e.stopPropagation()
              },
              onUpdate: (value: boolean) => toggleEnabled(hook, value)
            },
            {
              component: 'UButton',
              props: {
                icon: 'i-heroicons-trash',
                variant: 'outline',
                color: 'error'
              },
              onClick: (e?: Event) => {
                e?.stopPropagation();
                deleteHook(hook);
              }
            }
          ] : []"
        />
      </div>

      <CommonEmptyState
        v-else
        title="No hooks found"
        description="No webhook configurations have been created yet"
        icon="lucide:link"
        size="sm"
      />
    </Transition>

    <div class="flex justify-center" v-if="!loading && hooks.length > 0">
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
