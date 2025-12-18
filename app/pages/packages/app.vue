<template>
  <div class="space-y-6">
    
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="!isMounted || loading"
        title="Loading packages..."
        description="Fetching installed packages"
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
          :key="pkg.id"
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
          :header-actions="getHeaderActions(pkg)"
        />
      </div>

      <CommonEmptyState
        v-else
        title="No packages installed"
        description="Install your first package using the form above"
        icon="lucide:package"
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
  to: "/packages/install",
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
const total = computed(() => apiData.value?.meta?.totalCount || 0);

const { execute: removePackage, error: removePackageError } = useApi(
  "/package_definition",
  {
    method: "delete",
    errorContext: "Uninstall Package",
  }
);

const deletingPackages = ref(new Set<string>());

async function deletePackage(pkg: any) {
  const isConfirmed = await confirm({
    title: "Uninstall Package",
    content: `Are you sure you want to uninstall "${pkg.name}"? This action cannot be undone.`,
    confirmText: "Uninstall",
    cancelText: "Cancel",
  });

  if (!isConfirmed) return;

  deletingPackages.value.add(pkg.id);

  try {
    await removePackage({ id: pkg.id });

    if (removePackageError.value) {
      return;
    }

    toast.add({
      title: "Success",
      description: `Package ${pkg.name} uninstalled successfully`,
      color: "success",
    });

    await loadPackages();
  } finally {
    deletingPackages.value.delete(pkg.id);
  }
}

function getHeaderActions(pkg: any) {
  return [
    {
      component: "UButton",
      props: {
        icon: "i-heroicons-trash",
        variant: "outline",
        color: "error",
        loading: deletingPackages.value.has(pkg.id),
      },
      onClick: (e?: Event) => {
        e?.stopPropagation();
        deletePackage(pkg);
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
