<template>
  <div class="space-y-6">

    <UAlert
      v-if="pendingOps.size > 0"
      icon="lucide:loader"
      :title="pendingBannerTitle"
      color="info"
      variant="soft"
    />

    <DataTableSettingsTable
      v-model:page="page"
      :data="packages"
      :columns="columns"
      :loading="showInitialLoading || packagesRefreshing"
      :total="total"
      :page-limit="limit"
      page-size-key="server-packages"
      :pagination-loading="loading"
      :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
      @page-size-change="setPageSize"
      @row-click="pkg => navigateTo(`/packages/${getId(pkg)}`)"
    >
      <template #empty>
        <CommonEmptyState variant="naked" title="No server packages installed" description="Install packages to enhance your handlers and hooks" icon="lucide:server" size="sm" />
      </template>
    </DataTableSettingsTable>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { UBadge } from '#components';
import type { ColumnDef } from '@tanstack/vue-table';
import { settingsDateColumn, settingsTextColumn } from '~/utils/settings-table';
const { register: registerHeaderActions } = useHeaderActionRegistry();
const page = ref(1);
const limit = useSettingsPageSize('server-packages');
const router = useRouter();
const route = useRoute();
const { getId } = useDatabase();
const { adminSocket: $adminSocket } = useAdminSocket();
const PACKAGE_LIST_FIELDS = [
  "id",
  "name",
  "description",
  "version",
  "flags",
  "status",
  "createdAt",
].join(",");

const columns: ColumnDef<Record<string, any>>[] = [
  settingsTextColumn('name', 'Package'),
  settingsTextColumn('description', 'Description'),
  settingsTextColumn('version', 'Version'),
  {
    accessorKey: 'status', header: 'Status', enableSorting: false,
    cell: ({ getValue }) => {
      const status = String(getValue() || 'installed');
      return h(UBadge, { label: status, color: status === 'installed' ? 'success' : status === 'failed' ? 'error' : 'warning', variant: 'soft' });
    },
  },
  settingsTextColumn('flags', 'Flags'),
  { id: 'usage', header: 'Usage', enableSorting: false, accessorFn: pkg => pkg.status === 'installed' ? `$ctx.$pkgs.${String(pkg.name).replace(/[@\/\-]/g, '')}` : '_', cell: ({ getValue }) => h('span', { class: 'block truncate font-mono', title: String(getValue()) }, String(getValue())), meta: { style: { th: { width: '240px' }, td: { width: '240px' } } } },
  settingsDateColumn('createdAt', 'Installed'),
];

async function setPageSize(size: number) {
  if (page.value !== 1) await router.replace({ query: { ...route.query, page: undefined } });
  limit.value = size;
}

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
    limit: limit.value,
    fields: PACKAGE_LIST_FIELDS,
    meta: "*",
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
const total = computed(() => apiData.value?.meta?.filterCount || 0);

watch(() => route.query.page, value => { page.value = Math.max(1, Number(value) || 1); }, { immediate: true });

watch(
  [page, limit],
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
