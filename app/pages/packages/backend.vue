<template>
  <div class="space-y-6">

    <UAlert
      v-if="pendingOps.size > 0"
      icon="lucide:loader"
      :title="pendingBannerTitle"
      color="info"
      variant="soft"
    />

    <CommonResourceListFrame
      v-model:page="page"
      root-class=""
      :loading="showInitialLoading"
      :has-items="packages.length > 0"
      loading-title="Loading packages..."
      loading-description="Fetching installed server packages"
      empty-title="No server packages installed"
      empty-description="Install packages to enhance your handlers and hooks"
      empty-icon="lucide:server"
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
        <template #skeleton-row>
          <CommonResourceListSkeletonRow
            title-width="w-48"
            description-width="w-1/2 max-w-[30rem]"
            :chips="['w-20', 'w-20', 'w-24', 'w-36']"
            :show-trailing="false"
          />
        </template>

        <CommonResourceListItem
          v-for="pkg in packages"
          :key="getId(pkg)"
          :title="pkg.name"
          :description="pkg.description || 'No description'"
          icon="lucide:server"
          icon-color="primary"
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
                    component: 'UBadge',
                    props: {
                      variant: 'solid',
                      color: 'primary',
                      class:
                        'font-mono',
                    },
                  },
                ]
              : []),
          ]"
        >
          <template #skeleton-content>
            <span class="block h-4 w-48 rounded skeleton-gradient skeleton-pulse-slow" />
            <span class="block h-3 w-1/2 max-w-[30rem] rounded skeleton-inline skeleton-pulse-slow" />
            <span class="flex flex-wrap gap-2">
              <span class="block h-5 w-20 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
              <span class="block h-5 w-20 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
              <span class="block h-5 w-24 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
              <span class="hidden h-5 w-36 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow sm:block" />
            </span>
          </template>
        </CommonResourceListItem>
    </CommonResourceListFrame>
  </div>
</template>

<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
const page = ref(1);
const limit = 9;
const route = useRoute();
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
  gradient: "none",
});

registerHeaderActions({
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
    limit,
    filter: {
      type: { _eq: "Server" },
    },
  })),
  errorContext: "Load Server Packages",
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
