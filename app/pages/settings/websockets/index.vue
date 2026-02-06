<template>
  <div class="websocket-manager-page">
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="!isMounted || loading"
        title="Loading WebSocket gateways..."
        description="Fetching WebSocket configurations"
        size="md"
        type="card"
        context="page"
      />

      <div
        v-else-if="gateways.length > 0"
        class="grid gap-4"
        :class="
          isTablet
            ? 'grid-cols-1'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3'
        "
      >
        <CommonSettingsCard
          v-for="gateway in gateways"
          :key="gateway.id"
          :title="gateway.path"
          :description="gateway.description || 'WebSocket gateway'"
          :icon="getGatewayIcon(gateway)"
          :icon-color="pageIconColor"
          :card-class="'cursor-pointer transition-all'"
          :stats="[
            {
              label: 'Status',
              component: 'UBadge',
              props: {
                variant: 'soft',
                color: gateway.isEnabled ? 'success' : 'neutral',
              },
              value: gateway.isEnabled ? 'Active' : 'Inactive',
            },
            {
              label: 'Auth',
              component: 'UBadge',
              props: {
                variant: 'soft',
                color: gateway.requireAuth ? 'warning' : 'neutral',
              },
              value: gateway.requireAuth ? 'Required' : 'Public',
            },
            {
              label: 'Events',
              value: getEventCount(gateway.id),
            },
            {
              label: 'Connections',
              value: getConnectionCount(gateway.id),
            },
          ]"
          @click="navigateToDetail(gateway)"
          :header-actions="getHeaderActions(gateway)"
          :actions="getFooterActions(gateway)"
        />
      </div>

      <CommonEmptyState
        v-else
        title="No WebSocket gateways found"
        description="No WebSocket gateways have been created yet"
        icon="lucide:radio-tower"
        size="lg"
      />
    </Transition>

    <div
      v-if="!loading && gateways.length > 0 && total > limit"
      class="flex items-center justify-between mt-6"
    >
      <UPagination
        v-model:page="page"
        :items-per-page="limit"
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
  title: "WebSocket Manager",
  gradient: "cyan",
});

const pageIconColor = 'success';

const {
  data: apiData,
  pending: loading,
  execute: fetchGateways,
} = useApi(() => "/websocket_definition", {
  query: computed(() => ({
    fields: ["*", "events.*", "targetTables.*"].join(","),
    limit,
    page: page.value,
    meta: "*",
    sort: ["id"].join(","),
  })),
  errorContext: "Fetch WebSocket Gateways",
});

const gateways = computed(() => apiData.value?.data || []);
const total = computed(() => apiData.value?.meta?.totalCount || 0);

const gatewayLoaders = ref<Record<string, any>>({});
const connectionCounts = ref<Record<string, number>>({});

const { execute: updateGateway, error: updateError } = useApi(
  () => `/websocket_definition`,
  {
    method: "patch",
    errorContext: "Update WebSocket Gateway",
  }
);

useHeaderActionRegistry([
  {
    id: "create-websocket",
    label: "Create Gateway",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
    to: "/settings/websockets/create",
    permission: {
      and: [
        {
          route: "/websocket_definition",
          actions: ["create"],
        },
      ],
    },
  },
]);

function getGatewayIcon(gateway: any) {
  return "i-lucide-radio-tower";
}

function getEventCount(gatewayId: string | number): number {
  const gateway = gateways.value.find((g: any) => g.id === gatewayId);
  return gateway?.events?.length || 0;
}

function getConnectionCount(gatewayId: string | number): number {
  return connectionCounts.value[gatewayId] || 0;
}

function navigateToDetail(gateway: any) {
  navigateTo(`/settings/websockets/${getId(gateway)}`);
}

function getHeaderActions(gateway: any) {
  const actions = [];

  if (checkPermissionCondition({ or: [{ route: '/websocket_definition', actions: ['update'] }] })) {
    actions.push({
      component: 'USwitch',
      props: {
        'model-value': gateway.isEnabled,
        disabled: getGatewayLoader(gateway.id.toString()).isLoading
      },
      onClick: (e?: Event) => e?.stopPropagation(),
      onUpdate: () => toggleGatewayStatus(gateway)
    });
  }

  return actions;
}

function getFooterActions(gateway: any) {
  const hasDeletePermission = checkPermissionCondition({ or: [{ route: '/websocket_definition', actions: ['delete'] }] });

  return [
    {
      label: 'Delete',
      props: {
        icon: 'i-lucide-trash-2',
        variant: 'solid',
        color: 'error',
        size: 'sm',
      },
      disabled: !hasDeletePermission || gateway.isSystem,
      onClick: (e?: Event) => {
        e?.stopPropagation();
        deleteGateway(gateway);
      },
    }
  ];
}

function getGatewayLoader(gatewayId: string) {
  if (!gatewayLoaders.value[gatewayId]) {
    gatewayLoaders.value[gatewayId] = createLoader();
  }
  return gatewayLoaders.value[gatewayId];
}

const toggleGatewayStatus = async (gateway: any) => {
  const loader = getGatewayLoader(gateway.id.toString());
  const newStatus = !gateway.isEnabled;

  if (apiData.value?.data) {
    const gatewayIndex = apiData.value.data.findIndex(
      (g: any) => g.id === gateway.id
    );
    if (gatewayIndex !== -1) {
      apiData.value.data[gatewayIndex].isEnabled = newStatus;
    }
  }

  await loader.withLoading(() =>
    updateGateway({
      body: {
        isEnabled: newStatus,
      },
      id: gateway.id,
    })
  );

  if (updateError.value) {
    if (apiData.value?.data) {
      const gatewayIndex = apiData.value.data.findIndex(
        (g: any) => g.id === gateway.id
      );
      if (gatewayIndex !== -1) {
        apiData.value.data[gatewayIndex].isEnabled = !newStatus;
      }
    }
    return;
  }

  toast.add({
    title: "Success",
    description: `WebSocket gateway "${gateway.path}" has been ${
      newStatus ? "activated" : "deactivated"
    } successfully!`,
    color: "success",
  });
};

const { execute: deleteGatewayApi, error: deleteError } = useApi(
  () => `/websocket_definition`,
  {
    method: "delete",
    errorContext: "Delete WebSocket Gateway",
  }
);

const deleteGateway = async (gateway: any) => {
  const isConfirmed = await confirm({
    title: "Delete WebSocket Gateway",
    content: `Are you sure you want to delete "${gateway.path}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (isConfirmed) {
    await deleteGatewayApi({ id: gateway.id });

    if (deleteError.value) {
      return;
    }

    await fetchGateways();

    toast.add({
      title: "Success",
      description: `WebSocket gateway "${gateway.path}" has been deleted successfully!`,
      color: "success",
    });
  }
};

watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchGateways();
  },
  { immediate: true }
);
</script>
