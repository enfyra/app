<template>
  <CommonResourceListFrame
    root-class="oauth-config-page"
    :loading="showInitialLoading"
    :has-items="configs.length > 0"
    loading-title="Loading OAuth configurations..."
    loading-description="Fetching OAuth provider settings"
    loading-size="md"
    empty-title="No OAuth configurations found"
    empty-description="Configure OAuth providers to enable social login"
    empty-icon="lucide:key"
    empty-size="lg"
    v-model:page="page"
    :total="total"
    :items-per-page="limit"
    :pagination-loading="loading"
    :to="(p) => ({ path: route.path, query: { ...route.query, page: p } })"
    :pagination-ui="{ item: 'h-9 w-9 rounded-xl transition-all duration-300' }"
  >
        <template #skeleton-row>
          <CommonResourceListSkeletonRow
            title-width="w-36"
            description-width="w-1/2 max-w-[28rem]"
            :chips="['w-20', 'w-28']"
            trailing-width="w-10"
          />
        </template>

        <CommonResourceListItem
          v-for="config in configs"
          :key="config.id"
          :title="getProviderLabel(config.provider)"
          :description="config.description || `Configure ${getProviderLabel(config.provider)} OAuth`"
          :icon="getProviderIcon(config.provider)"
          :icon-color="pageIconColor"
          :content-loading="configsRefreshing"
          :stats="[
            {
              label: 'Status',
              component: 'UBadge',
              props: {
                variant: 'soft',
                color: config.isEnabled ? 'success' : 'neutral',
              },
              value: config.isEnabled ? 'Active' : 'Inactive',
            },
            {
              label: 'Client ID',
              value: maskClientId(config.clientId),
            },
          ]"
          @click="navigateToDetail(config)"
          :header-actions="getHeaderActions(config)"
        >
          <template #skeleton-content>
            <span class="block h-4 w-36 rounded skeleton-gradient skeleton-pulse-slow" />
            <span class="block h-3 w-1/2 max-w-[28rem] rounded skeleton-inline skeleton-pulse-slow" />
            <span class="flex flex-wrap gap-2">
              <span class="block h-5 w-20 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
              <span class="block h-5 w-28 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
            </span>
          </template>
          <template #skeleton-actions>
            <span class="hidden h-7 w-10 flex-shrink-0 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow md:block" />
          </template>
        </CommonResourceListItem>
  </CommonResourceListFrame>
</template>

<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
interface OAuthConfigDefinition {
  id?: string;
  _id?: string;
  provider: string;
  description?: string;
  clientId: string;
  isEnabled: boolean;
}

const page = ref(1);
const limit = 9;

const notify = useNotify();
const { getLoader: getConfigLoader } = useKeyedLoaders();
const { checkPermissionCondition } = usePermissions();
const { getId } = useDatabase();

const route = useRoute();
const { registerPageHeader } = usePageHeaderRegistry();
const OAUTH_CONFIG_LIST_FIELDS = [
  "id",
  "provider",
  "description",
  "clientId",
  "isEnabled",
].join(",");

registerPageHeader({
  title: "OAuth Configuration",
  gradient: "blue",
});

const pageIconColor = 'primary';

const {
  data: apiData,
  pending: loading,
  execute: fetchConfigs,
} = useApi(() => "/enfyra_oauth_config", {
  query: computed(() => ({
    fields: OAUTH_CONFIG_LIST_FIELDS,
    limit,
    page: page.value,
    meta: "*",
    sort: ["provider"].join(","),
  })),
  errorContext: "Fetch OAuth Configs",
});

const {
  items: configs,
  showInitialLoading,
  isRefreshing: configsRefreshing,
} = useStableListState(() => apiData.value?.data, () => loading.value);
const total = computed(() => apiData.value?.meta?.totalCount || 0);


const { execute: updateConfig, error: updateError } = useApi(
  () => `/enfyra_oauth_config`,
  {
    method: "patch",
    errorContext: "Update OAuth Config",
  }
);

registerHeaderActions([
  {
    id: "create-oauth-config",
    label: "Add Provider",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
    to: "/settings/oauth/config/create",
    permission: {
      and: [
        {
          route: "/enfyra_oauth_config",
          methods: ["POST"],
        },
      ],
    },
  },
]);

function getProviderIcon(provider: string) {
  switch (provider) {
    case "google":
      return "logos:google-icon";
    case "facebook":
      return "logos:facebook";
    case "github":
      return "mdi:github";
    default:
      return "lucide:key";
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

function maskClientId(clientId: string) {
  if (!clientId || clientId.length < 10) return clientId;
  return clientId.substring(0, 8) + "..." + clientId.substring(clientId.length - 4);
}

function navigateToDetail(config: OAuthConfigDefinition) {
  navigateTo(`/settings/oauth/config/${getId(config)}`);
}

function getHeaderActions(config: OAuthConfigDefinition) {
  const actions = [];

  if (checkPermissionCondition({ or: [{ route: '/enfyra_oauth_config', methods: ['PATCH'] }] })) {
    actions.push({
      component: 'USwitch',
      props: {
        'model-value': config.isEnabled,
        disabled: getConfigLoader(String(getId(config) ?? '')).isLoading
      },
      onClick: (e?: Event) => e?.stopPropagation(),
      onUpdate: () => toggleConfigStatus(config)
    });
  }

  return actions;
}

const toggleConfigStatus = async (config: OAuthConfigDefinition) => {
  const loader = getConfigLoader(String(getId(config) ?? ''));
  const newStatus = !config.isEnabled;

  if (apiData.value?.data) {
    const configIndex = apiData.value.data.findIndex(
      (c: any) => c.id === config.id
    );
    if (configIndex !== -1) {
      apiData.value.data[configIndex].isEnabled = newStatus;
    }
  }

  await loader.withLoading(() =>
    updateConfig({
      body: {
        isEnabled: newStatus,
      },
      id: config.id,
    })
  );

  if (updateError.value) {
    if (apiData.value?.data) {
      const configIndex = apiData.value.data.findIndex(
        (c: any) => c.id === config.id
      );
      if (configIndex !== -1) {
        apiData.value.data[configIndex].isEnabled = !newStatus;
      }
    }
    return;
  }

  notify.success("Success", `${getProviderLabel(config.provider)} OAuth has been ${
      newStatus ? "enabled" : "disabled"
    } successfully!`);
};

watch(
  () => route.query.page,
  async (newVal) => {
    page.value = newVal ? Number(newVal) : 1;
    await fetchConfigs();
  },
  { immediate: true }
);
</script>
