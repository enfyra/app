<template>
  <CommonResourceListFrame
    v-model:page="page"
    :loading="showInitialLoading"
    :has-items="packages.length > 0"
    loading-title="Loading packages..."
    loading-description="Fetching installed packages"
    empty-title="No packages installed"
    empty-description="Install your first package using the form above"
    empty-icon="lucide:package"
    :total="total"
    :items-per-page="limit"
    :pagination-loading="loading"
    pagination-class="mt-4"
    pagination-align="center"
    :pagination-show-range="false"
    pagination-color="secondary"
    pagination-active-color="secondary"
    :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
  >
        <CommonResourceListItem
          v-for="pkg in packages"
          :key="getId(pkg)"
          :title="pkg.name"
          :description="pkg.description || 'No description'"
          icon="lucide:package-2"
          icon-color="primary"
          :loading="packagesRefreshing"
          @click="navigateTo(`/packages/${getId(pkg)}`)"
          :stats="[
            {
              label: 'Version',
              component: 'UBadge',
              props: {
                variant: 'soft',
                color: 'primary',
              },
              value: pkg.version,
            },
            {
              label: 'Installed',
              value: new Date(pkg.createdAt).toLocaleDateString(),
            },
            ...(pkg.flags
              ? [
                  {
                    label: 'Flags',
                    value: pkg.flags,
                  },
                ]
              : []),
          ]"
        />
  </CommonResourceListFrame>
</template>

<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
const page = ref(1);
const limit = 10;
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
    limit: limit,
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
const total = computed(() => apiData.value?.meta?.totalCount || 0);

watch(
  page,
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
