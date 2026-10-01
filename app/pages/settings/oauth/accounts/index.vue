<template>
  <DataTableSettingsTable
    v-model:page="page"
    :data="accounts"
    :columns="columns"
    :loading="showInitialLoading"
    :total="total"
    :page-limit="pageLimit"
    page-size-key="oauth-accounts"
    :pagination-loading="loading"
    @page-size-change="setPageSize"
    :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
    @row-click="account => navigateTo(`/settings/oauth/accounts/${getId(account)}`)"
  />
</template>

<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table';

const page = ref(1);
const pageLimit = useSettingsPageSize('oauth-accounts');
const route = useRoute();
const tableName = "enfyra_oauth_account";
const OAUTH_ACCOUNT_LIST_FIELDS = [
  "id",
  "provider",
  "providerUserId",
  "user.id",
  "user.email",
  "user.name",
].join(",");

const { getId } = useDatabase();
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "OAuth Accounts",
  gradient: "blue",
});

const {
  data: apiData,
  pending: loading,
  execute: fetchAccounts,
} = useApi(() => `/${tableName}`, {
  query: computed(() => ({
    fields: OAUTH_ACCOUNT_LIST_FIELDS,
    limit: pageLimit,
    page: page.value,
    meta: "*",
    sort: "-createdAt",
  })),
  errorContext: "Fetch OAuth Accounts",
});

const {
  items: accounts,
  showInitialLoading,
} = useStableListState(() => apiData.value?.data, () => loading.value);
const total = computed(() => apiData.value?.meta?.totalCount || 0);

function getProviderLabel(provider: string) {
  switch (provider) {
    case "google":
      return "Google";
    case "facebook":
      return "Facebook";
    case "github":
      return "GitHub";
    default:
      return provider;
  }
}

function getUserEmail(account: any) {
  const user = account?.user;
  if (!user) return null;
  return user.email || user.name || "-";
}

function maskProviderId(id: string) {
  if (!id || id.length < 12) return id ?? "-";
  return id.substring(0, 6) + "..." + id.substring(id.length - 4);
}

const columns: ColumnDef<Record<string, any>>[] = [
  { accessorKey: 'provider', header: 'Provider', enableSorting: false, cell: ({ getValue }) => getProviderLabel(String(getValue())) },
  { id: 'user', header: 'User', enableSorting: false, cell: ({ row }) => getUserEmail(row.original) || '_' },
  { accessorKey: 'providerUserId', header: 'Provider ID', enableSorting: false, cell: ({ getValue }) => maskProviderId(String(getValue() ?? '')) },
];

async function setPageSize(size: number) {
  if (page.value !== 1) await navigateTo({ path: route.path, query: { ...route.query, page: undefined } }, { replace: true });
  pageLimit.value = size;
}

watch(() => route.query.page, newVal => { page.value = Math.max(1, Number(newVal) || 1); }, { immediate: true });
watch([page, pageLimit], () => { void fetchAccounts(); }, { immediate: true });
</script>
