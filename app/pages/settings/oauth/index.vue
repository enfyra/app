<template>
  <div class="oauth-config-page">
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="!isMounted || loading"
        title="Loading OAuth configurations..."
        description="Fetching OAuth provider settings"
        size="md"
        type="card"
        context="page"
      />

      <div
        v-else-if="configs.length > 0"
        class="grid gap-4"
        :class="
          isTablet
            ? 'grid-cols-2'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3'
        "
      >
        <CommonSettingsCard
          v-for="config in configs"
          :key="config.id"
          :title="getProviderLabel(config.provider)"
          :description="config.description || `Configure ${getProviderLabel(config.provider)} OAuth`"
          :icon="getProviderIcon(config.provider)"
          :icon-color="pageIconColor"
          :card-class="'cursor-pointer transition-all'"
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
        />
      </div>

      <CommonEmptyState
        v-else
        title="No OAuth configurations found"
        description="Configure OAuth providers to enable social login"
        icon="lucide:key"
        size="lg"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
const page = ref(1);
const limit = 9;

const toast = useToast();
const { createLoader } = useLoader();
const { checkPermissionCondition } = usePermissions();
const { getId } = useDatabase();

const { isMounted } = useMounted();
const { isTablet } = useScreen();
const route = useRoute();
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "OAuth Configuration",
  gradient: "blue",
});

const pageIconColor = 'primary';

const {
  data: apiData,
  pending: loading,
  execute: fetchConfigs,
} = useApi(() => "/oauth_config_definition", {
  query: computed(() => ({
    fields: ["*"].join(","),
    limit,
    page: page.value,
    meta: "*",
    sort: ["provider"].join(","),
  })),
  errorContext: "Fetch OAuth Configs",
});

const configs = computed(() => apiData.value?.data || []);
const total = computed(() => apiData.value?.meta?.totalCount || 0);

const configLoaders = ref<Record<string, any>>({});

const { execute: updateConfig, error: updateError } = useApi(
  () => `/oauth_config_definition`,
  {
    method: "patch",
    errorContext: "Update OAuth Config",
  }
);

useHeaderActionRegistry([
  {
    id: "create-oauth-config",
    label: "Add Provider",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
    to: "/settings/oauth/create",
    permission: {
      and: [
        {
          route: "/oauth_config_definition",
          actions: ["create"],
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
  navigateTo(`/settings/oauth/${getId(config)}`);
}

function getHeaderActions(config: OAuthConfigDefinition) {
  const actions = [];

  if (checkPermissionCondition({ or: [{ route: '/oauth_config_definition', actions: ['update'] }] })) {
    actions.push({
      component: 'USwitch',
      props: {
        'model-value': config.isEnabled,
        disabled: getConfigLoader((config.id ?? config._id ?? '').toString()).isLoading
      },
      onClick: (e?: Event) => e?.stopPropagation(),
      onUpdate: () => toggleConfigStatus(config)
    });
  }

  return actions;
}

function getConfigLoader(configId: string) {
  if (!configLoaders.value[configId]) {
    configLoaders.value[configId] = createLoader();
  }
  return configLoaders.value[configId];
}

const toggleConfigStatus = async (config: OAuthConfigDefinition) => {
  const loader = getConfigLoader((config.id ?? config._id ?? '').toString());
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

  toast.add({
    title: "Success",
    description: `${getProviderLabel(config.provider)} OAuth has been ${
      newStatus ? "enabled" : "disabled"
    } successfully!`,
    color: "success",
  });
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
