<template>
  <div class="flow-manager-page">
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="showInitialLoading"
        title="Loading flows..."
        description="Fetching flow configurations"
        size="md"
        type="card"
        context="page"
      />

      <CommonAnimatedGrid
        v-else-if="flows.length > 0"
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
      </CommonAnimatedGrid>

      <CommonEmptyState
        v-else
        title="No flows found"
        description="No flows have been created yet"
        icon="lucide:workflow"
        size="lg"
      />
    </Transition>

    <CommonPaginationBar
      v-if="flows.length > 0 && total > limit"
      v-model:page="page"
      class="mt-6"
      :items-per-page="limit"
      :total="total"
      :loading="loading"
      :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
      :ui="{ item: 'h-9 w-9 rounded-xl transition-all duration-300' }"
    />
  </div>
</template>

<script setup lang="ts">
import { getTriggerColor } from '~/utils/flow.constants';

const page = ref(1);
const limit = 9;

const notify = useNotify();
const { confirm } = useConfirm();
const { getLoader: getFlowLoader } = useKeyedLoaders();
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
const showInitialLoading = computed(() => !isMounted.value || (loading.value && !apiData.value));
const total = computed(() => apiData.value?.meta?.totalCount || 0);

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
