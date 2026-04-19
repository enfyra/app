<template>
  <div class="space-y-6">

    <UAlert
      v-if="pendingOps.size > 0"
      icon="lucide:loader"
      :title="pendingBannerTitle"
      color="info"
      variant="soft"
    />

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
            ...(pkg.status && pkg.status !== 'installed'
              ? [
                  {
                    label: 'Status',
                    component: 'UBadge',
                    props: {
                      variant: 'soft',
                      color: pkg.status === 'failed' ? 'error' : 'warning',
                    },
                    value: pkg.status,
                  },
                ]
              : []),
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
            ...(pkg.status === 'installed'
              ? [
                  {
                    label: 'Usage',
                    value: `$ctx.$pkgs.${pkg.name.replace(/[@\/\-]/g, '')}`,
                    component: 'code',
                    props: {
                      class:
                        'text-xs font-mono text-green-600 bg-green-50 px-2 py-1 rounded hover:text-white',
                    },
                  },
                ]
              : []),
          ]"
          :actions="[]"
          :header-actions="[]"
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
const notify = useNotify();
const route = useRoute();
const { isTablet } = useScreen();
const { isMounted } = useMounted();
const { getId } = useDatabase();
const { adminSocket: $adminSocket } = useAdminSocket();

const pendingOps = ref(new Map<string, string>());

const pendingBannerTitle = computed(() => {
  const ops = Array.from(pendingOps.value.values());
  if (ops.length === 1) return ops[0];
  return `${ops.length} package operations in progress...`;
});

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
  pendingOps.value.set(pkgId, `Uninstalling ${pkgName}...`);

  try {
    await removePackage({ id: pkgId });

    if (removePackageError.value) {
      pendingOps.value.delete(pkgId);
      return;
    }

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
        loading: deletingPackages.value.has(pkgId) || pkg.status === 'uninstalling',
        disabled: pkg.status && pkg.status !== 'installed' && pkg.status !== 'failed',
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

function handleSystemEvent(event: string, data: any) {
  const id = String(data?.id);
  const name = data?.name || data?.packages?.map((p: any) => p.name).join(', ') || '';

  if (event === '$system:package:installing') {
    if (data?.packages) {
      for (const p of data.packages) {
        pendingOps.value.set(String(p.id), `Installing ${p.name}...`);
      }
    } else if (id) {
      pendingOps.value.set(id, `Installing ${name}...`);
    }
    loadPackages();
    return;
  } else if (event === '$system:package:updating') {
    pendingOps.value.set(id, `Updating ${name}...`);
    loadPackages();
  } else if (event === '$system:package:uninstalling') {
    pendingOps.value.set(id, `Uninstalling ${name}...`);
    loadPackages();
  } else if (event === '$system:package:installed') {
    if (data?.packages) {
      for (const p of data.packages) pendingOps.value.delete(String(p.id));
    } else {
      pendingOps.value.delete(id);
    }
    loadPackages();
  } else if (event === '$system:package:uninstalled') {
    pendingOps.value.delete(id);
    loadPackages();
  } else if (event === '$system:package:failed') {
    if (data?.packages) {
      for (const p of data.packages) pendingOps.value.delete(String(p.id));
    } else {
      pendingOps.value.delete(id);
    }
    loadPackages();
  }
}

const systemEvents = [
  '$system:package:installing',
  '$system:package:updating',
  '$system:package:uninstalling',
  '$system:package:installed',
  '$system:package:uninstalled',
  '$system:package:failed',
];

onMounted(() => {
  if ($adminSocket) {
    for (const event of systemEvents) {
      $adminSocket.on(event, (data: any) => handleSystemEvent(event, data));
    }
  }
});

onUnmounted(() => {
  if ($adminSocket) {
    for (const event of systemEvents) {
      $adminSocket.off(event);
    }
  }
});
</script>
