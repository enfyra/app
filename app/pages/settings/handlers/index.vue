<script setup lang="ts">
const toast = useToast();
const page = ref(1);
const pageLimit = 9;
const route = useRoute();
const tableName = "route_handler_definition";
const { confirm } = useConfirm();
const { getIncludeFields } = useSchema(tableName);

const { isMounted } = useMounted();
const { isTablet } = useScreen();

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
    <!-- Header -->
    <CommonPageHeader
      title="Handler Manager"
      title-size="md"
      show-background
      background-gradient="from-rose-500/8 via-pink-400/5 to-transparent"
      padding-y="py-6"
    />
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
          isTablet ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        "
      >
        <CommonSettingsCard
          v-for="handler in routeHandlers"
          :key="handler.id"
          :title="handler.name"
          :description="handler.description || 'No description'"
          icon="lucide:command"
          icon-color="primary"
          :card-class="'cursor-pointer lg:hover:ring-2 lg:hover:ring-primary/20 transition-all'"
          @click="navigateTo(`/settings/handlers/${handler.id}`)"
          :stats="[
            {
              label: 'Type',
              component: 'UBadge',
              props: { variant: 'soft', color: 'primary' },
              value: handler.type || 'Unknown',
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
          :actions="[]"
          :header-actions="!handler.isSystem ? [{
            component: 'UButton',
            props: {
              icon: 'i-heroicons-trash',
              variant: 'outline',
              color: 'error'
            },
            onClick: (e?: Event) => {
              e?.stopPropagation();
              deleteHandler(handler.id);
            }
          }] : []"
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

    <div
      class="flex justify-center"
      v-if="!loading && routeHandlers.length > 0"
    >
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
