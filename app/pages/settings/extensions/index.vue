<template>
  <div class="extension-manager-page">
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="!isMounted || loading"
        title="Loading extensions..."
        description="Fetching extension registry"
        size="md"
        type="card"
        context="page"
      />

      <div
        v-else-if="extensions.length > 0"
        class="grid gap-4"
        :class="
          isTablet
            ? 'grid-cols-2'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3'
        "
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
      </div>

      <CommonEmptyState
        v-else
        title="No extensions found"
        description="No extensions have been created yet"
        icon="lucide:puzzle"
        size="lg"
      />
    </Transition>

    <!-- Premium Pagination -->
    <div
      v-if="!loading && extensions.length > 0 && total > limit"
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
  title: "Extension Manager",
  gradient: "purple",
});

// Fixed color for system extensions
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

const extensions = computed(() => apiData.value?.data || []);
const total = computed(() => apiData.value?.meta?.totalCount || 0);

const extensionLoaders = ref<Record<string, any>>({});

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
        disabled: getExtensionLoader(extension.id.toString()).isLoading
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
      disabled: !hasDeletePermission,
      onClick: (e?: Event) => {
        e?.stopPropagation();
        deleteExtension(extension);
      },
    }
  ];
}

function getExtensionLoader(extensionId: string) {
  if (!extensionLoaders.value[extensionId]) {
    extensionLoaders.value[extensionId] = createLoader();
  }
  return extensionLoaders.value[extensionId];
}

const toggleExtensionStatus = async (extension: ExtensionDefinition) => {
  const loader = getExtensionLoader(extension.id.toString());
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

  toast.add({
    title: "Success",
    description: `Extension "${extension.name}" has been ${
      newStatus ? "activated" : "deactivated"
    } successfully!`,
    color: "success",
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

    toast.add({
      title: "Success",
      description: `Extension "${extension.id}" has been deleted successfully!`,
      color: "success",
    });
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
