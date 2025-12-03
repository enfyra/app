<script setup lang="ts">
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

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Hook Manager",
  gradient: "purple",
});

// Fixed color for event handling
const pageIconColor = 'success';

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

  await updateHookApi({ id: getId(hook), body: { isEnabled: hook.isEnabled } });

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
          isTablet ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3'
        "
      >
        <CommonSettingsCard
          v-for="hook in hooks"
          :key="hook.id"
          :title="hook.name || 'Unnamed'"
          :description="hook.description || 'No description'"
          icon="lucide:link"
          :icon-color="pageIconColor"
          :card-class="'cursor-pointer transition-all'"
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
          :actions="[
            {
              label: 'Delete',
              props: {
                icon: 'i-lucide-trash-2',
                variant: 'solid',
                color: 'error',
                size: 'sm',
              },
              disabled: hook.isSystem,
              onClick: (e?: Event) => {
                e?.stopPropagation();
                deleteHook(hook);
              },
            }
          ]"
          :header-actions="!hook.isSystem ? [
            {
              component: 'USwitch',
              props: {
                modelValue: hook.isEnabled,
                onClick: (e: Event) => e.stopPropagation()
              },
              onUpdate: (value: boolean) => toggleEnabled(hook, value)
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

    <!-- Premium Pagination -->
    <div
      v-if="!loading && hooks.length > 0 && total > pageLimit"
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
