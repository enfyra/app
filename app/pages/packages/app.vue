<template>
  <div class="space-y-6">

    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="showInitialLoading"
        title="Loading packages..."
        description="Fetching installed packages"
        size="sm"
        type="card"
        context="page"
      />

      <CommonAnimatedGrid
        v-else-if="packages.length > 0"
        :grid-class="isTablet ? 'grid gap-4 grid-cols-2' : 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'"
      >
        <CommonSettingsCard
          v-for="pkg in packages"
          :key="getId(pkg)"
          :title="pkg.name"
          :description="pkg.description || 'No description'"
          icon="lucide:package-2"
          icon-color="primary"
          :card-class="'cursor-pointer lg:hover:ring-2 lg:hover:ring-primary/20 transition-all'"
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
          :actions="[]"
          :header-actions="[]"
        />
      </CommonAnimatedGrid>

      <CommonEmptyState
        v-else
        title="No packages installed"
        description="Install your first package using the form above"
        icon="lucide:package"
        size="sm"
      />
    </Transition>

    <CommonPaginationBar
      v-if="packages.length > 0 && total > limit"
      v-model:page="page"
      class="mt-4"
      align="center"
      :items-per-page="limit"
      :total="total"
      :loading="loading"
      :show-range="false"
      :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
      color="secondary"
      active-color="secondary"
    />
  </div>
</template>

<script setup lang="ts">
const page = ref(1);
const limit = 9;
const { confirm } = useConfirm();
const notify = useNotify();
const route = useRoute();
const { isTablet } = useScreen();
const { isMounted } = useMounted();
const { getId } = useDatabase();
const { fetchAppPackages } = useGlobalState();
const { adminSocket: $adminSocket } = useAdminSocket();

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "App Packages",
  gradient: "blue",
});

useHeaderActionRegistry({
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
        route: "/package_definition",
        actions: ["create"],
      },
    ],
  },
});

const {
  data: apiData,
  pending: loading,
  execute: loadPackages,
} = useApi("/package_definition", {
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

const packages = computed(() => apiData.value?.data || []);
const showInitialLoading = computed(() => !isMounted.value || (loading.value && !apiData.value));
const total = computed(() => apiData.value?.meta?.totalCount || 0);

const { execute: removePackage, error: removePackageError } = useApi(
  "/package_definition",
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
