<template>
  <div class="extension-manager-page">
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="showInitialLoading"
        title="Loading extensions..."
        description="Fetching extension registry"
        size="md"
        type="card"
        context="page"
      />

      <CommonAnimatedGrid
        v-else-if="extensions.length > 0"
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
          :actions="getFooterActions(extension)"
        </CommonSettingsCard>
      </CommonAnimatedGrid>

      <CommonEmptyState
        v-else
        title="No extensions found"
        description="No extensions have been created yet"
        icon="lucide:puzzle"
        size="lg"
      />
    </Transition>

    <CommonPaginationBar
      v-if="extensions.length > 0 && total > limit"
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

const page = ref(1);
const limit = 9;

const notify = useNotify();
const { confirm } = useConfirm();
const { getLoader: getExtensionLoader } = useKeyedLoaders();
const { checkPermissionCondition } = usePermissions();
const { getId } = useDatabase();
const { invalidateExtensionCache } = useDynamicComponent();

const { isMounted } = useMounted();
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
} = useApi(() => "/extension_definition", {
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

const extensions = computed(() => apiData.value?.data || []);
const showInitialLoading = computed(() => !isMounted.value || (loading.value && !apiData.value));
const total = computed(() => apiData.value?.meta?.totalCount || 0);


const { execute: updateExtension, error: updateError } = useApi(
  () => `/extension_definition`,
  {
    method: "patch",
    errorContext: "Update Extension",
  }
);

useHeaderActionRegistry([
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
          route: "/extension_definition",
          actions: ["create"],
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
    default:
      return "Unknown";
  }
}

function navigateToDetail(extension: ExtensionDefinition) {
  navigateTo(`/settings/extensions/${getId(extension)}`);
}

function getHeaderActions(extension: ExtensionDefinition) {
  const actions = [];

  if (checkPermissionCondition({ or: [{ route: '/extension_definition', actions: ['update'] }] })) {
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
  const hasDeletePermission = checkPermissionCondition({ or: [{ route: '/extension_definition', actions: ['delete'] }] });

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
};

const { execute: deleteExtensionApi, error: deleteError } = useApi(
  () => `/extension_definition`,
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
