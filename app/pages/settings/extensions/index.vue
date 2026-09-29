<template>
  <DataTableSettingsTable
    v-model:page="page"
    :data="extensions"
    :columns="columns"
    :actions="getRowActions"
    :loading="showInitialLoading"
    :total="total"
    :page-limit="limit"
    page-size-key="extensions"
    :pagination-loading="loading"
    @page-size-change="setPageSize"
    :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
    @row-click="extension => navigateTo(`/settings/extensions/${getId(extension)}`)"
  />
</template>

<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table';
import type { DataTableRowAction } from '~/types/data-table-columns';
import { settingsStatusColumn, settingsTextColumn } from '~/utils/settings-table';

const { register: registerHeaderActions } = useHeaderActionRegistry();

const page = ref(1);
const limit = useSettingsPageSize('extensions');

const notify = useNotify();
const { confirm } = useConfirm();
const { getLoader: getExtensionLoader } = useKeyedLoaders();
const { checkPermissionCondition } = usePermissions();
const { getId } = useDatabase();
const { invalidateExtensionCache } = useDynamicComponent();
const { loadGlobalExtensions } = useGlobalExtensions();

const route = useRoute();
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Extension Manager",
  gradient: "purple",
});

const {
  data: apiData,
  pending: loading,
  execute: fetchExtensions,
} = useApi(() => "/enfyra_extension", {
  query: computed(() => ({
    fields: EXTENSION_LIST_FIELDS,
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

const columns: ColumnDef<Record<string, any>>[] = [
  settingsTextColumn('name', 'Extension'),
  settingsTextColumn('description', 'Description'),
  { accessorKey: 'type', header: 'Type', enableSorting: false, cell: ({ getValue }) => getExtensionTypeLabel(String(getValue())) },
  { id: 'route', header: 'Route', enableSorting: false, cell: ({ row }) => row.original.menu?.path || '_' },
  settingsStatusColumn(),
];

function getRowActions(extension: Record<string, any>): DataTableRowAction[] {
  return [
    ...(checkPermissionCondition({ or: [{ route: '/enfyra_extension', methods: ['PATCH'] }] }) ? [{
      label: extension.isEnabled ? 'Disable' : 'Enable', icon: extension.isEnabled ? 'lucide:power-off' : 'lucide:power',
      disabled: getExtensionLoader(String(getId(extension) ?? '')).isLoading.value,
      onSelect: () => toggleExtensionStatus(extension as ExtensionDefinition),
    }] : []),
    ...(checkPermissionCondition({ or: [{ route: '/enfyra_extension', methods: ['DELETE'] }] }) && !extension.isSystem ? [{
      label: 'Delete', icon: 'lucide:trash-2', color: 'error',
      onSelect: () => deleteExtension(extension as ExtensionDefinition),
    }] : []),
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

async function setPageSize(size: number) {
  if (page.value !== 1) await navigateTo({ path: route.path, query: { ...route.query, page: undefined } }, { replace: true });
  limit.value = size;
}

watch(() => route.query.page, newVal => { page.value = Math.max(1, Number(newVal) || 1); }, { immediate: true });
watch([page, limit], () => { void fetchExtensions(); }, { immediate: true });
</script>
