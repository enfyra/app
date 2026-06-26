<template>
  <CommonCardListFrame
    v-model:page="page"
    root-class="flow-manager-page"
    :loading="showInitialLoading"
    :has-items="flows.length > 0"
    loading-title="Loading flows..."
    loading-description="Fetching flow configurations"
    loading-size="md"
    empty-title="No flows found"
    empty-description="No flows have been created yet"
    empty-icon="lucide:workflow"
    empty-size="lg"
    :total="total"
    :items-per-page="limit"
    :pagination-loading="loading"
    :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
    :pagination-ui="{ item: 'h-9 w-9 rounded-xl transition-all duration-300' }"
  >
    <CommonAnimatedGrid
      :animate="false"
      :grid-class="isTablet ? 'grid gap-4 grid-cols-1' : 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3'"
    >
        <CommonSettingsCard
          v-for="flow in flows"
          :key="flow.id"
          :title="flow.name"
          :description="flow.description || 'Flow'"
          :icon="flow.icon || 'i-lucide-workflow'"
          icon-color="primary"
          card-class="cursor-pointer transition-all"
          :content-loading="flowsRefreshing"
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
          :methods="getFooterActions(flow)"
        />
      </CommonAnimatedGrid>
  </CommonCardListFrame>
</template>

<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
import { getTriggerColor } from '~/utils/flow.constants';

const page = ref(1);
const limit = 9;

const notify = useNotify();
const { confirm } = useConfirm();
const { getLoader: getFlowLoader } = useKeyedLoaders();
const { checkPermissionCondition } = usePermissions();
const { getId } = useDatabase();
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
} = useApi(() => "/enfyra_flow", {
  query: computed(() => ({
    fields: ["*", "steps.*"].join(","),
    limit,
    page: page.value,
    meta: "*",
    sort: ["id"].join(","),
  })),
  errorContext: "Fetch Flows",
});

const {
  items: flows,
  showInitialLoading,
  isRefreshing: flowsRefreshing,
} = useStableListState(() => apiData.value?.data, () => loading.value);
const total = computed(() => apiData.value?.meta?.totalCount || 0);

const { execute: updateFlow, error: updateError } = useApi(
  () => `/enfyra_flow`,
  { method: "patch", errorContext: "Update Flow" }
);

registerHeaderActions([
  {
    id: "create-flow",
    label: "Create Flow",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
    to: "/settings/flows/create",
    permission: {
      and: [{ route: "/enfyra_flow", methods: ["POST"] }],
    },
  },
]);


function navigateToDetail(flow: any) {
  navigateTo(`/settings/flows/${getId(flow)}`);
}

function getHeaderActions(flow: any) {
  const actions = [];
  if (checkPermissionCondition({ or: [{ route: '/enfyra_flow', methods: ['PATCH'] }] })) {
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
  const hasDelete = checkPermissionCondition({ or: [{ route: '/enfyra_flow', methods: ['DELETE'] }] });
  return [
    {
      label: 'Delete',
      props: { icon: 'i-lucide-trash-2', variant: 'solid', color: 'error', size: 'sm' },
      disabled: !hasDelete || flow.isSystem,
      onClick: (e?: Event) => { e?.stopPropagation(); deleteFlow(flow); },
    },
  ];
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

  notify.success("Success", `Flow "${flow.name}" has been ${newStatus ? "activated" : "deactivated"} successfully!`);
};

const { execute: deleteFlowApi, error: deleteError } = useApi(
  () => `/enfyra_flow`,
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
    notify.success("Success", `Flow "${flow.name}" has been deleted successfully!`);
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
