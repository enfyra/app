<template>
  <CommonCardListFrame
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
      <CommonAnimatedGrid
        :animate="false"
        :grid-class="isTablet ? 'grid gap-4 grid-cols-2' : 'grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3'"
      >
        <CommonSettingsCard
          v-for="pkg in packages"
          :key="getId(pkg)"
          :title="pkg.name"
          :description="pkg.description || 'No description'"
          icon="lucide:package-2"
          icon-color="primary"
          :card-class="'cursor-pointer transition-all lg:hover:ring-2 lg:hover:ring-[var(--border-accent)]'"
          :content-loading="packagesRefreshing"
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
          :methods="[]"
          :header-actions="[]"
        />
      </CommonAnimatedGrid>
  </CommonCardListFrame>
</template>

<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
const page = ref(1);
const limit = 9;
const { confirm } = useConfirm();
const notify = useNotify();
const route = useRoute();
const { isTablet } = useScreen();
const { getId } = useDatabase();
const { fetchAppPackages } = useGlobalState();
const { adminSocket: $adminSocket } = useAdminSocket();

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
    filter: {
      type: { _eq: "App" },
    },
    deep: {
      installedBy: {},
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

const { execute: removePackage, error: removePackageError } = useApi(
  "/enfyra_package",
  {
    method: "delete",
    errorContext: "Uninstall Package",
  }
);

const deletingPackages = ref(new Set<string>());

async function deletePackage(pkgId: any, pkgName: string) {
  const isConfirmed = await confirm({
    title: "Uninstall Package",
    content: `Are you sure you want to uninstall "${pkgName}"? This action cannot be undone.`,
    confirmText: "Uninstall",
    cancelText: "Cancel",
  });

  if (!isConfirmed) return;

  deletingPackages.value.add(pkgId);

  try {
    await removePackage({ id: pkgId });

    if (removePackageError.value) {
      return;
    }

    await fetchAppPackages();

    notify.success("Success", `Package ${pkgName} uninstalled successfully`);

    await loadPackages();
  } finally {
    deletingPackages.value.delete(pkgId);
  }
}

function getHeaderActions(pkg: any) {
  const pkgId = getId(pkg);

  return [
    {
      component: "UButton",
      props: {
        icon: "i-heroicons-trash",
        variant: "outline",
        color: "error",
        loading: deletingPackages.value.has(pkgId),
      },
      onClick: (e?: Event) => {
        e?.stopPropagation();
        deletePackage(pkgId, pkg.name);
      },
    },
  ];
}

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
