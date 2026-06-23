<template>
  <CommonCardListFrame
    v-model:page="page"
    root-class="extension-manager-page"
    :loading="showInitialLoading"
    :has-items="extensions.length > 0"
    loading-title="Loading extensions..."
    loading-description="Fetching extension registry"
    loading-size="md"
    empty-title="No extensions found"
    empty-description="No extensions have been created yet"
    empty-icon="lucide:puzzle"
    empty-size="lg"
    :total="total"
    :items-per-page="limit"
    :pagination-loading="loading"
    :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
    :pagination-ui="{ item: 'h-9 w-9 rounded-xl transition-all duration-300' }"
  >
    <CommonAnimatedGrid
      :animate="false"
      :grid-class="isTablet ? 'grid gap-4 grid-cols-2' : 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3'"
    >
        <CommonSettingsCard
          v-for="extension in extensions"
          :key="extension.id"
          :title="extension.name"
          :description="extension.description"
          :icon="getExtensionIcon(extension)"
          :icon-color="pageIconColor"
          :card-class="'cursor-pointer transition-all'"
          :content-loading="extensionsRefreshing"
          :stats="[
            {
              label: 'Type',
              component: 'UBadge',
              props: { variant: 'soft', color: 'primary' },
              value: getExtensionTypeLabel(extension.type),
            },
            ...(extension.menu?.path
              ? [
                  {
                    label: 'Route',
                    value: extension.menu.path,
                  },
                ]
              : []),
            {
              label: 'Status',
              component: 'UBadge',
              props: {
                variant: 'soft',
                color: extension.isEnabled ? 'success' : 'neutral',
              },
              value: extension.isEnabled ? 'Active' : 'Inactive',
            },
          ]"
          @click="navigateToDetail(extension)"
          :header-actions="getHeaderActions(extension)"
          :methods="getFooterActions(extension)"
        </CommonSettingsCard>
      </CommonAnimatedGrid>
  </CommonCardListFrame>
</template>

<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();

const page = ref(1);
const limit = 9;

const notify = useNotify();
const { confirm } = useConfirm();
const { getLoader: getExtensionLoader } = useKeyedLoaders();
const { checkPermissionCondition } = usePermissions();
const { getId } = useDatabase();
const { invalidateExtensionCache } = useDynamicComponent();
const { loadGlobalExtensions } = useGlobalExtensions();

const { isTablet } = useScreen();
const route = useRoute();
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Extension Manager",
  gradient: "purple",
});

const pageIconColor = 'primary';

const {
  data: apiData,
  pending: loading,
  execute: fetchExtensions,
} = useApi(() => "/enfyra_extension", {
  query: computed(() => ({
    fields: ["*", "menu.*"].join(","),
    limit,
    page: page.value,
    meta: "*",
    sort: ["id"].join(","),
  })),
  errorContext: "Fetch Extensions",
});
const { fetchMenuDefinitions } = useMenuApi();

const {
  items: extensions,
  showInitialLoading,
  isRefreshing: extensionsRefreshing,
} = useStableListState(() => apiData.value?.data, () => loading.value);
const total = computed(() => apiData.value?.meta?.totalCount || 0);


const { execute: updateExtension, error: updateError } = useApi(
  () => `/enfyra_extension`,
  {
    method: "patch",
    errorContext: "Update Extension",
  }
);

registerHeaderActions([
  {
    id: "create-extension",
    label: "Create Extension",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
            to: "/settings/extensions/create",
    permission: {
      and: [
        {
          route: "/enfyra_extension",
          methods: ["POST"],
        },
      ],
    },
  },
]);

function getExtensionIcon(extension: ExtensionDefinition) {
  switch (extension.type) {
    case "page":
      return "i-lucide-file-text";
    case "widget":
      return "i-lucide-layout-dashboard";
    case "global":
      return "i-lucide-orbit";
    default:
      return "i-lucide-puzzle";
  }
}

function getExtensionTypeLabel(type: string) {
  switch (type) {
    case "page":
      return "Page";
    case "widget":
      return "Widget";
    case "global":
      return "Global";
    default:
      return "Unknown";
  }
}

function navigateToDetail(extension: ExtensionDefinition) {
  navigateTo(`/settings/extensions/${getId(extension)}`);
}

function getHeaderActions(extension: ExtensionDefinition) {
  const actions = [];

  if (checkPermissionCondition({ or: [{ route: '/enfyra_extension', methods: ['PATCH'] }] })) {
    actions.push({
      component: 'USwitch',
      props: {
        'model-value': extension.isEnabled,
        disabled: getExtensionLoader(String(getId(extension) ?? '')).isLoading
      },
      onClick: (e?: Event) => e?.stopPropagation(),
      onUpdate: () => toggleExtensionStatus(extension)
    });
  }

  return actions;
}

function getFooterActions(extension: ExtensionDefinition) {
  const hasDeletePermission = checkPermissionCondition({ or: [{ route: '/enfyra_extension', methods: ['DELETE'] }] });

  return [
    {
      label: 'Delete',
      props: {
        icon: 'i-lucide-trash-2',
        variant: 'solid',
        color: 'error',
        size: 'sm',
      },
      disabled: !hasDeletePermission || extension.isSystem,
      onClick: (e?: Event) => {
        e?.stopPropagation();
        deleteExtension(extension);
      },
    }
  ];
}

const toggleExtensionStatus = async (extension: ExtensionDefinition) => {
  const loader = getExtensionLoader(String(getId(extension) ?? ''));
  const newStatus = !extension.isEnabled;

  if (apiData.value?.data) {
    const extensionIndex = apiData.value.data.findIndex(
      (e: any) => e.id === extension.id
    );
    if (extensionIndex !== -1) {
      apiData.value.data[extensionIndex].isEnabled = newStatus;
    }
  }

  await loader.withLoading(() =>
    updateExtension({
      body: {
        isEnabled: newStatus,
      },
      id: extension.id,
    })
  );

  if (updateError.value) {
    if (apiData.value?.data) {
      const extensionIndex = apiData.value.data.findIndex(
        (e: any) => e.id === extension.id
      );
      if (extensionIndex !== -1) {
        apiData.value.data[extensionIndex].isEnabled = !newStatus;
      }
    }
    return;
  }

  notify.success("Success", `Extension "${extension.name}" has been ${
      newStatus ? "activated" : "deactivated"
    } successfully!`);
  invalidateExtensionCache({
    reason: "status",
    id: getId(extension),
    extensionId: extension.extensionId,
    path: extension.menu?.path ?? null,
  });
  await loadGlobalExtensions({ forceReload: true });
};

const { execute: deleteExtensionApi, error: deleteError } = useApi(
  () => `/enfyra_extension`,
  {
    method: "delete",
    errorContext: "Delete Extension",
  }
);

const deleteExtension = async (extension: ExtensionDefinition) => {
  const isConfirmed = await confirm({
    title: "Delete Extension",
    content: `Are you sure you want to delete "${extension.description}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (isConfirmed) {
    await deleteExtensionApi({ id: extension.id });

    if (deleteError.value) {
      return;
    }

    await fetchExtensions();
    await fetchMenuDefinitions();
    invalidateExtensionCache({
      reason: "deleted",
      id: getId(extension),
      extensionId: extension.extensionId,
      path: extension.menu?.path ?? null,
    });
    await loadGlobalExtensions({ forceReload: true });

    notify.success("Success", `Extension "${extension.id}" has been deleted successfully!`);
  }
};

watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchExtensions();
  },
  { immediate: true }
);
</script>
