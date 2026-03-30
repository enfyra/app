<template>
  <div class="flow-manager-page">
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="!isMounted || loading"
        title="Loading flows..."
        description="Fetching flow configurations"
        size="md"
        type="card"
        context="page"
      />

      <div
        v-else-if="flows.length > 0"
        class="grid gap-4"
        :class="
          isTablet
            ? 'grid-cols-1'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3'
        "
      >
        <CommonSettingsCard
          v-for="flow in flows"
          :key="flow.id"
          :title="flow.name"
          :description="flow.description || 'Flow'"
          :icon="flow.icon || 'i-lucide-workflow'"
          icon-color="primary"
          card-class="cursor-pointer transition-all"
          :stats="[
            {
              label: 'Trigger',
              component: 'UBadge',
              props: { variant: 'soft', color: getTriggerColor(flow.triggerType) },
              value: flow.triggerType,
            },
            {
              label: 'Status',
              component: 'UBadge',
              props: { variant: 'soft', color: flow.isEnabled ? 'success' : 'neutral' },
              value: flow.isEnabled ? 'Active' : 'Inactive',
            },
            {
              label: 'Steps',
              value: flow.steps?.length || 0,
            },
            {
              label: 'Timeout',
              value: `${(flow.timeout || 30000) / 1000}s`,
            },
          ]"
          @click="navigateToDetail(flow)"
          :header-actions="getHeaderActions(flow)"
          :actions="getFooterActions(flow)"
        />
      </div>

      <CommonEmptyState
        v-else
        title="No flows found"
        description="No flows have been created yet"
        icon="lucide:workflow"
        size="lg"
      />
    </Transition>

    <div
      v-if="!loading && flows.length > 0 && total > limit"
      class="flex items-center justify-between mt-6"
    >
      <UPagination
        v-model:page="page"
        :items-per-page="limit"
        :total="total"
        show-edges
        :sibling-count="1"
        :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
        :ui="{ item: 'h-9 w-9 rounded-xl transition-all duration-300' }"
      />
      <p class="hidden md:block text-sm text-gray-400">
        Showing <span class="text-gray-700 dark:text-gray-200">{{ (page - 1) * limit + 1 }}-{{ Math.min(page * limit, total) }}</span> of <span class="text-gray-700 dark:text-gray-200">{{ total }}</span> results
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const page = ref(1);
const limit = 9;

const toast = useToast();
const { confirm } = useConfirm();
const { createLoader } = useLoader();
const { checkPermissionCondition } = usePermissions();
const { getId } = useDatabase();
const { isMounted } = useMounted();
const { isTablet } = useScreen();
const route = useRoute();
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Flow Manager",
  gradient: "purple",
});

const {
  data: apiData,
  pending: loading,
  execute: fetchFlows,
} = useApi(() => "/flow_definition", {
  query: computed(() => ({
    fields: ["*", "steps.*"].join(","),
    limit,
    page: page.value,
    meta: "*",
    sort: ["id"].join(","),
  })),
  errorContext: "Fetch Flows",
});

const flows = computed(() => apiData.value?.data || []);
const total = computed(() => apiData.value?.meta?.totalCount || 0);

const flowLoaders = ref<Record<string, any>>({});

const { execute: updateFlow, error: updateError } = useApi(
  () => `/flow_definition`,
  { method: "patch", errorContext: "Update Flow" }
);

useHeaderActionRegistry([
  {
    id: "create-flow",
    label: "Create Flow",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
    to: "/settings/flows/create",
    permission: {
      and: [{ route: "/flow_definition", actions: ["create"] }],
    },
  },
]);

function getTriggerColor(triggerType: string) {
  const colors: Record<string, string> = {
    schedule: 'info',
    manual: 'neutral',
  };
  return colors[triggerType] || 'neutral';
}

function navigateToDetail(flow: any) {
  navigateTo(`/settings/flows/${getId(flow)}`);
}

function getHeaderActions(flow: any) {
  const actions = [];
  if (checkPermissionCondition({ or: [{ route: '/flow_definition', actions: ['update'] }] })) {
    actions.push({
      component: 'USwitch',
      props: {
        'model-value': flow.isEnabled,
        disabled: getFlowLoader(flow.id.toString()).isLoading,
      },
      onClick: (e?: Event) => e?.stopPropagation(),
      onUpdate: () => toggleFlowStatus(flow),
    });
  }
  return actions;
}

function getFooterActions(flow: any) {
  const hasDelete = checkPermissionCondition({ or: [{ route: '/flow_definition', actions: ['delete'] }] });
  return [
    {
      label: 'Delete',
      props: { icon: 'i-lucide-trash-2', variant: 'solid', color: 'error', size: 'sm' },
      disabled: !hasDelete || flow.isSystem,
      onClick: (e?: Event) => { e?.stopPropagation(); deleteFlow(flow); },
    },
  ];
}

function getFlowLoader(flowId: string) {
  if (!flowLoaders.value[flowId]) {
    flowLoaders.value[flowId] = createLoader();
  }
  return flowLoaders.value[flowId];
}

const toggleFlowStatus = async (flow: any) => {
  const loader = getFlowLoader(flow.id.toString());
  const newStatus = !flow.isEnabled;

  if (apiData.value?.data) {
    const idx = apiData.value.data.findIndex((f: any) => f.id === flow.id);
    if (idx !== -1) apiData.value.data[idx].isEnabled = newStatus;
  }

  await loader.withLoading(() => updateFlow({ body: { isEnabled: newStatus }, id: flow.id }));

  if (updateError.value) {
    if (apiData.value?.data) {
      const idx = apiData.value.data.findIndex((f: any) => f.id === flow.id);
      if (idx !== -1) apiData.value.data[idx].isEnabled = !newStatus;
    }
    return;
  }

  toast.add({
    title: "Success",
    description: `Flow "${flow.name}" has been ${newStatus ? "activated" : "deactivated"} successfully!`,
    color: "success",
  });
};

const { execute: deleteFlowApi, error: deleteError } = useApi(
  () => `/flow_definition`,
  { method: "delete", errorContext: "Delete Flow" }
);

const deleteFlow = async (flow: any) => {
  const isConfirmed = await confirm({
    title: "Delete Flow",
    content: `Are you sure you want to delete "${flow.name}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (isConfirmed) {
    await deleteFlowApi({ id: flow.id });
    if (deleteError.value) return;
    await fetchFlows();
    toast.add({
      title: "Success",
      description: `Flow "${flow.name}" has been deleted successfully!`,
      color: "success",
    });
  }
};

watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchFlows();
  },
  { immediate: true }
);
</script>
