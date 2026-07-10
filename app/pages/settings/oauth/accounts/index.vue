<template>
  <CommonResourceListFrame
    v-model:page="page"
    root-class="oauth-accounts-page"
    :loading="showInitialLoading"
    :has-items="accounts.length > 0"
    loading-title="Loading OAuth accounts..."
    loading-description="Fetching linked OAuth accounts"
    loading-size="md"
    empty-title="No OAuth accounts found"
    empty-description="OAuth accounts will appear when users link their social login"
    empty-icon="lucide:link"
    empty-size="lg"
    :total="total"
    :items-per-page="pageLimit"
    :pagination-loading="loading"
    :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
    :pagination-ui="{ item: 'h-9 w-9 rounded-xl transition-all duration-300' }"
  >
    <CommonResourceListItem
      v-for="account in accounts"
      :key="getId(account)"
      :title="getProviderLabel(account.provider)"
      :description="getUserEmail(account)"
      :icon="getProviderIcon(account.provider)"
      :icon-color="pageIconColor"
      :loading="accountsRefreshing"
      @click="navigateToDetail(account)"
      :stats="[
        {
          label: 'Provider ID',
          value: maskProviderId(account.providerUserId),
        },
        {
          label: 'User',
          value: getUserEmail(account) || '-',
        },
      ]"
    />
  </CommonResourceListFrame>
</template>

<script setup lang="ts">
const page = ref(1);
const pageLimit = 12;
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

const pageIconColor = 'primary';

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
  isRefreshing: accountsRefreshing,
} = useStableListState(() => apiData.value?.data, () => loading.value);
const total = computed(() => apiData.value?.meta?.totalCount || 0);

function getProviderIcon(provider: string) {
  switch (provider) {
    case "google":
      return "logos:google-icon";
    case "facebook":
      return "logos:facebook";
    case "github":
      return "mdi:github";
    default:
      return "lucide:link";
  }
}

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

function navigateToDetail(account: any) {
  navigateTo(`/settings/oauth/accounts/${getId(account)}`);
}

watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchAccounts();
  },
  { immediate: true }
);
</script>
