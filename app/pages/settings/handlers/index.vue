<script setup lang="ts">
const toast = useToast();
const page = ref(1);
const pageLimit = 9;
const route = useRoute();
const tableName = "route_handler_definition";
const { confirm } = useConfirm();
const { getIncludeFields } = useSchema(tableName);
const { getId } = useDatabase();

const { isMounted } = useMounted();

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Handler Manager",
  gradient: "purple",
});
const { isTablet } = useScreen();

// Fixed color for processing/actions
const pageIconColor = 'success';

const {
  data: apiData,
  pending: loading,
  execute: fetchRouteHandlers,
} = useApi(() => "/route_handler_definition", {
  query: computed(() => ({
    fields: getIncludeFields(),
    sort: "-createdAt",
    meta: "*",
    page: page.value,
    limit: pageLimit,
  })),
  errorContext: "Fetch Route Handlers",
});

const { execute: removeHandler, error: removeHandlerError } = useApi(
  () => `/route_handler_definition`,
  {
    method: "delete",
    errorContext: "Delete Handler",
  }
);

const routeHandlers = computed(() => apiData.value?.data || []);
const total = computed(() => {
  return apiData.value?.meta?.totalCount || 0;
});

useHeaderActionRegistry({
  id: "create-handler",
  label: "Create Handler",
  icon: "lucide:plus",
  variant: "solid",
  color: "primary",
  size: "md",
  to: "/settings/handlers/create",
  permission: {
    and: [
      {
        route: "/route_handler_definition",
        actions: ["create"],
      },
    ],
  },
});

async function deleteHandler(id: number) {
  const ok = await confirm({
    title: "Are you sure?",
  });
  if (!ok) return;

  await removeHandler({ id });

  if (removeHandlerError.value) {
    return;
  }

  toast.add({ 
    title: "Success",
    description: "Handler deleted successfully", 
    color: "success" 
  });
  await fetchRouteHandlers();
}

watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchRouteHandlers();
  },
  { immediate: true }
);
</script>

<template>
  <div class="space-y-6">
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="!isMounted || loading"
        title="Loading handlers..."
        description="Fetching route handlers"
        size="sm"
        type="card"
        context="page"
      />

      <div
        v-else-if="routeHandlers.length"
        class="grid gap-4"
        :class="
          isTablet ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3'
        "
      >
        <CommonSettingsCard
          v-for="handler in routeHandlers"
          :key="handler.id"
          :title="handler.name || 'Untitled Handler'"
          :description="handler.description || 'No description'"
          icon="lucide:command"
          :icon-color="pageIconColor"
          :card-class="'cursor-pointer transition-all'"
          @click="navigateTo(`/settings/handlers/${getId(handler)}`)"
          :stats="[
            {
              label: 'Route',
              value: handler.route?.path || '-',
            },
            {
              label: 'Method',
              component: 'UBadge',
              props: { variant: 'soft', color: 'primary' },
              value: handler.method?.method || '-',
            },
            {
              label: 'System',
              component: handler.isSystem ? 'UBadge' : undefined,
              props: handler.isSystem ? { variant: 'soft', color: 'info' } : undefined,
              value: handler.isSystem ? 'System' : '-'
            },
            {
              label: 'Created',
              value: new Date(handler.createdAt).toLocaleDateString(),
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
              disabled: handler.isSystem,
              onClick: (e?: Event) => {
                e?.stopPropagation();
                deleteHandler(getId(handler));
              },
            }
          ]"
        />
      </div>

      <CommonEmptyState
        v-else
        title="No handlers found"
        description="No route handlers have been created yet"
        icon="lucide:terminal"
        size="sm"
      />
    </Transition>

    <!-- Premium Pagination -->
    <div
      v-if="!loading && routeHandlers.length > 0 && total > pageLimit"
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
