<template>
  <div class="oauth-accounts-page">
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="!isMounted || loading"
        title="Loading OAuth accounts..."
        description="Fetching linked OAuth accounts"
        size="md"
        type="card"
        context="page"
      />

      <div
        v-else-if="accounts.length > 0"
        class="grid gap-4"
        :class="
          isTablet
            ? 'grid-cols-2'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3'
        "
      >
        <CommonSettingsCard
          v-for="account in accounts"
          :key="account.id ?? account._id"
          :title="getProviderLabel(account.provider)"
          :description="getUserEmail(account)"
          :icon="getProviderIcon(account.provider)"
          :icon-color="pageIconColor"
          :card-class="'cursor-pointer transition-all'"
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
      </div>

      <CommonEmptyState
        v-else
        title="No OAuth accounts found"
        description="OAuth accounts will appear when users link their social login"
        icon="lucide:link"
        size="lg"
      />
    </Transition>

    <div
      v-if="!loading && accounts.length > 0 && total > pageLimit"
      class="flex items-center justify-between mt-6"
    >
      <UPagination
        v-model:page="page"
        :items-per-page="pageLimit"
        :total="total"
        show-edges
        :sibling-count="1"
        :to="
          (p) => ({
            path: route.path,
            query: { ...route.query, page: p },
          })
        "
        :ui="{
          item: 'h-9 w-9 rounded-xl transition-all duration-300',
        }"
      />
      <p class="hidden md:block text-sm text-gray-400">
        Showing <span class="text-gray-700 dark:text-gray-200">{{ (page - 1) * pageLimit + 1 }}-{{ Math.min(page * pageLimit, total) }}</span> of <span class="text-gray-700 dark:text-gray-200">{{ total }}</span> results
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const page = ref(1);
const pageLimit = 12;
const route = useRoute();
const tableName = "oauth_account_definition";

const { getId } = useDatabase();
const { isMounted } = useMounted();
const { isTablet } = useScreen();
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
    fields: "*,user.id,user._id,user.email,user.name",
    limit: pageLimit,
    page: page.value,
    meta: "*",
    sort: "-createdAt",
  })),
  errorContext: "Fetch OAuth Accounts",
});

const accounts = computed(() => apiData.value?.data || []);
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
