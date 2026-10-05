<template>
  <div class="space-y-6">
    <div class="eapp-page-constrained">
      <CommonPanel :sections="[{ value: 'account' }]">
        <template #account-header><h2 class="text-sm font-medium">Account</h2></template>
        <template #account>
<CommonFormCard>
        <UForm :state="form">
          <FormEditorLazy
            v-model="form"
            v-model:errors="errors"
            :table-name="tableName"
            :excluded="['createdAt', 'updatedAt', 'isSystem']"
            :field-map="disabledFieldMap"
            :loading="loading"
          />
        </UForm>
      </CommonFormCard>
        </template>
      </CommonPanel>
    </div>

    <CommonEmptyState
      v-if="!loading && !account"
      title="OAuth account not found"
      description="The requested OAuth account could not be loaded"
      icon="lucide:link"
      size="sm"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  title: "OAuth Account Detail",
});

const route = useRoute();
const { registerPageHeader } = usePageHeaderRegistry();

const tableName = "enfyra_oauth_account";
const { getIdFieldName } = useDatabase();

const {
  data: apiData,
  pending: loading,
  execute: fetchAccount,
} = useApi(() => `/${tableName}`, {
  query: computed(() => ({
    fields: "*,user.id,user._id,user.email,user.name",
    filter: { [getIdFieldName()]: { _eq: route.params.id } },
  })),
  errorContext: "Fetch OAuth Account",
});

const account = computed(() => apiData.value?.data?.[0]);
const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});

const { definition } = useSchema(tableName);
const disabledFieldMap = computed(() => {
  const map: Record<string, { disabled: boolean }> = {};
  const fields = definition.value || [];
  for (const field of fields) {
    const key = field.name || field.propertyName;
    if (key) map[key] = { disabled: true };
  }
  return map;
});

watch(() => account.value?.provider, (provider: string) => {
  if (provider) {
    registerPageHeader({
      title: `${getProviderLabel(provider)} Account`,
      gradient: "blue",
    });
  }
}, { immediate: true });

function getProviderLabel(provider: string) {
  switch (provider) {
    case "google": return "Google";
    case "facebook": return "Facebook";
    case "github": return "GitHub";
    default: return provider || "-";
  }
}

async function initializeForm() {
  await fetchAccount();
  const data = apiData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
  }
}

onMounted(() => {
  initializeForm();
});
</script>
