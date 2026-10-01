<template>
  <DataTableSettingsTable
    v-model:page="page"
    :data="packages"
    :columns="columns"
    :loading="showInitialLoading || packagesRefreshing"
    :total="total"
    :page-limit="limit"
    page-size-key="app-packages"
    :pagination-loading="loading"
    :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
    @page-size-change="setPageSize"
    @row-click="pkg => navigateTo(`/packages/${getId(pkg)}`)"
  >
    <template #empty>
      <CommonEmptyState variant="naked" title="No packages installed" description="Install your first app package" icon="lucide:package" size="sm" />
    </template>
  </DataTableSettingsTable>
</template>

<script setup lang="ts">
import { settingsDateColumn, settingsTextColumn } from "~/utils/settings-table";
const { register: registerHeaderActions } = useHeaderActionRegistry();
const page = ref(1);
const limit = useSettingsPageSize('app-packages');
const router = useRouter();
const columns = [settingsTextColumn('name', 'Package'), settingsTextColumn('description', 'Description'), settingsTextColumn('version', 'Version'), settingsTextColumn('flags', 'Flags'), settingsDateColumn('createdAt', 'Installed')];

async function setPageSize(size: number) {
  if (page.value !== 1) await router.replace({ query: { ...route.query, page: undefined } });
  limit.value = size;
}
const route = useRoute();
const { getId } = useDatabase();
const { fetchAppPackages } = useGlobalState();
const { adminSocket: $adminSocket } = useAdminSocket();
const PACKAGE_LIST_FIELDS = [
  "id",
  "name",
  "description",
  "version",
  "flags",
  "createdAt",
].join(",");

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "App Packages",
  gradient: "none",
});

registerHeaderActions({
  id: "create-package",
  label: "Install Package",
  icon: "lucide:package-plus",
  variant: "solid",
  color: "primary",
  size: "md",
  to: "/packages/install?type=app",
  permission: {
    and: [
      {
        route: "/enfyra_package",
        methods: ["POST"],
      },
    ],
  },
});

const {
  data: apiData,
  pending: loading,
  execute: loadPackages,
} = useApi("/enfyra_package", {
  query: computed(() => ({
    page: page.value,
    limit: limit.value,
    fields: PACKAGE_LIST_FIELDS,
    meta: "*",
    filter: {
      type: { _eq: "App" },
    },
  })),
  errorContext: "Load App Packages",
});

const {
  items: packages,
  showInitialLoading,
  isRefreshing: packagesRefreshing,
} = useStableListState(() => apiData.value?.data, () => loading.value);
const total = computed(() => apiData.value?.meta?.filterCount || 0);

watch(() => route.query.page, value => { page.value = Math.max(1, Number(value) || 1); }, { immediate: true });

watch(
  [page, limit],
  () => {
    loadPackages();
  },
  { immediate: true }
);

onMounted(() => {
  if ($adminSocket) {
    $adminSocket.on('$system:package:uninstalled', () => {
      loadPackages();
      fetchAppPackages();
    });
  }
});

onUnmounted(() => {
  if ($adminSocket) {
    $adminSocket.off('$system:package:uninstalled');
  }
});
</script>
