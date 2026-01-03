<template>
  <div class="space-y-6">
    
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="!isMounted || loading"
        title="Loading packages..."
        description="Fetching installed server packages"
        size="sm"
        type="card"
        context="page"
      />

      <div
        v-else-if="packages.length > 0"
        class="grid gap-4"
        :class="
          isTablet ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        "
      >
        <CommonSettingsCard
          v-for="pkg in packages"
          :key="getId(pkg)"
          :title="pkg.name"
          :description="pkg.description || 'No description'"
          icon="lucide:server"
          icon-color="success"
          :card-class="'cursor-pointer lg:hover:ring-2 lg:hover:ring-success/20 transition-all'"
          @click="navigateTo(`/packages/${getId(pkg)}`)"
          :stats="[
            {
              label: 'Version',
              component: 'UBadge',
              props: {
                variant: 'soft',
                color: 'success',
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
            {
              label: 'Usage',
              value: `$ctx.$pkgs.${pkg.name.replace(/[@\/\-]/g, '')}`,
              component: 'code',
              props: {
                class:
                  'text-xs font-mono text-green-600 bg-green-50 px-2 py-1 rounded hover:text-white',
              },
            },
          ]"
          :actions="[]"
          :header-actions="getHeaderActions(pkg)"
        />
      </div>

      <CommonEmptyState
        v-else
        title="No server packages installed"
        description="Install packages to enhance your handlers and hooks"
        icon="lucide:server"
        size="sm"
      />
    </Transition>

    <div
      class="flex justify-center mt-4"
      v-if="!loading && packages.length > 0"
    >
      <UPagination
        v-if="total > limit"
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
        color="secondary"
        active-color="secondary"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const page = ref(1);
const limit = 9;
const { confirm } = useConfirm();
const toast = useToast();
const route = useRoute();
const { isTablet } = useScreen();
const { isMounted } = useMounted();
const { getId } = useDatabase();

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Server Packages",
  gradient: "cyan",
});

useHeaderActionRegistry({
  id: "create-server-package",
  label: "Install Package",
  icon: "lucide:server",
  variant: "solid",
  color: "primary",
  size: "md",
  to: "/packages/install?type=server",
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
    limit,
    filter: {
      type: { _eq: "Server" },
    },
  })),
  errorContext: "Load Server Packages",
});

const packages = computed(() => apiData.value?.data || []);
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

    toast.add({
      title: "Success",
      description: `Package ${pkgName} uninstalled successfully`,
      color: "success",
    });

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
</script>
