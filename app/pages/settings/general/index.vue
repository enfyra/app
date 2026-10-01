<script setup lang="ts">
const notify = useNotify();
const { register: registerHeaderActions } = useHeaderActionRegistry();
const { confirm } = useConfirm();
const { checkPermissionCondition } = usePermissions();
const { getIdFieldName } = useDatabase();
const errors = ref<Record<string, string>>({});
const route = useRoute();
const router = useRouter();
const activeTab = computed({
  get: () => route.query.tab === 'cors' ? 'cors' : 'general',
  set: (value: string | number) => {
    void router.push({ query: { ...route.query, tab: value === 'cors' ? 'cors' : 'general' } });
  },
});
const settingsTabs = [
  { label: 'General', value: 'general', slot: 'general', icon: 'lucide:settings-2' },
  { label: 'CORS', value: 'cors', slot: 'cors', icon: 'lucide:globe' },
];

const { validateForm } = useFormValidation("enfyra_setting");

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "General Settings",
  description: "Configure system-wide settings and preferences",
  variant: "default",
  gradient: "cyan",
});

const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();

async function handleReset() {
  const ok = await confirm({
    title: "Reset Changes",
    content: "Are you sure you want to discard all changes? All modifications will be lost.",
  });
  if (!ok) {
    return;
  }

  if (formChanges.originalData.value) {
    setting.value = formChanges.discardChanges(setting.value);
    hasFormChanges.value = false;
    
    notify.success("Reset Complete", "All changes have been discarded.");
  }
}

const canUpdateSetting = computed(() =>
  checkPermissionCondition({
    and: [{ route: "/setting", methods: ["PATCH"] }],
  })
);

const {
  data: apiData,
  pending: loading,
  execute: loadSetting,
} = useApi(() => `/enfyra_setting`, {
  query: {
    fields: "*",
    limit: 1,
  },
  errorContext: "Load Settings",
});

const setting = ref<Record<string, any>>({});

const generalFormSections = [
  {
    id: "project",
    class: "border-b border-[var(--border-subtle)] pb-4 md:pb-6",
    fields: ["projectName", "projectFavicon", "projectDescription",  "isInit"],

  },
  {
    id: "limits",
    fields: ["maxQueryDepth", "maxUploadFileSize", "maxRequestBodySize"],
  },
];

const fieldMap = {
  isInit: {
    fieldProps: { class: "md:col-span-1 w-full min-w-0" },
  },
  projectName: {
    fieldProps: { class: "md:col-span-1 w-full min-w-0" },
  },
  projectDescription: {
    fieldProps: { class: "md:col-span-1 w-full min-w-0" },
  },
  projectFavicon: {
    fieldProps: { class: "md:col-span-1 w-full min-w-0" },
  },
  maxQueryDepth: {
    fieldProps: { class: "md:col-span-1" },
  },
  maxUploadFileSize: {
    fieldProps: { class: "md:col-span-1" },
  },
  maxRequestBodySize: {
    fieldProps: { class: "md:col-span-1" },
  },
};

async function initializeForm() {
  await loadSetting();
  const data = apiData.value?.data?.[0];
  setting.value = data ? { ...data } : {};
  if (data) {
    formChanges.update(data);
  }
}

const {
  execute: saveSetting,
  pending: saveLoading,
  error: saveError,
} = useApi(() => `/enfyra_setting/${getId(setting.value)}`, {
  method: "patch",
  errorContext: "Save Settings",
});

async function handleSaveSetting() {
  if (!setting.value) return;

  if (!await validateForm(setting.value, errors)) return;

  await saveSetting({ body: setting.value });

  if (saveError.value) {
    return;
  }

  notify.success("Success", "Configuration saved successfully");
  errors.value = {};
  hasFormChanges.value = false;

  await loadSetting();
  const freshData = apiData.value?.data?.[0];
  if (freshData) {
    setting.value = { ...freshData };
    formChanges.update(freshData);
  }

  formEditorRef.value?.confirmChanges();
}

registerHeaderActions([
  {
    id: 'reset-general-settings', label: 'Reset', icon: 'lucide:rotate-ccw', variant: 'outline', color: 'warning', order: 1,
    show: computed(() => activeTab.value === 'general' && hasFormChanges.value),
    disabled: computed(() => loading.value || saveLoading.value),
    onClick: handleReset,
  },
  {
    id: 'save-general-settings', label: 'Save', icon: 'lucide:save', variant: 'solid', color: 'primary', order: 999,
    show: computed(() => activeTab.value === 'general' && canUpdateSetting.value),
    loading: saveLoading,
    disabled: computed(() => loading.value || saveLoading.value || !hasFormChanges.value),
    onClick: handleSaveSetting,
  },
]);

onMounted(() => {
  initializeForm();
});
</script>

<template>
  <div class="general-settings-page eapp-page-constrained">
    <CommonTabbedPanel v-model="activeTab" :items="settingsTabs" :unmount-on-hide="false">
      <template #general>
        <CommonFormCard class="general-settings-section-inner">
          <CommonLoadingState
            v-if="loading"
            title="Loading settings…"
            description="Fetching configuration from the server"
            size="sm"
            type="form"
            context="inline"
            class="min-h-[12rem]"
          />
          <UForm v-else @submit="handleSaveSetting" :state="setting">
            <FormEditorLazy
              ref="formEditorRef"
              table-name="enfyra_setting"
              mode="update"
              layout="grid"
              v-model="setting"
              v-model:errors="errors"
              @has-changed="(hasChanged) => (hasFormChanges = hasChanged)"
              :loading="false"
              :excluded="[getIdFieldName(), 'createdAt', 'updatedAt']"
              :sections="generalFormSections"
              :field-map="fieldMap"
            />

          </UForm>
        </CommonFormCard>
      </template>
      <template #cors>
        <CommonFormCard class="general-settings-section-inner">
          <p class="mb-4 text-sm text-muted">Changes take effect immediately.</p>
          <CommonCorsOriginList />
        </CommonFormCard>
      </template>
    </CommonTabbedPanel>
  </div>
</template>

<style scoped>
.general-settings-page {
  display: grid;
  gap: 24px;
}

.general-settings-section-inner {
  position: relative;
}

</style>
