<script setup lang="ts">
const notify = useNotify();
const { confirm } = useConfirm();
const { checkPermissionCondition } = usePermissions();
const { getIdFieldName } = useDatabase();
const errors = ref<Record<string, string>>({});

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
    class: "border-b border-[var(--border-subtle)] pb-6",
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

onMounted(() => {
  initializeForm();
});
</script>

<template>
  <div class="general-settings-page eapp-page-constrained">
    <div class="general-settings-card surface-card">
      <div class="general-settings-card-inner">
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

          <div class="general-settings-actions">
            <UButton
              v-if="hasFormChanges"
              label="Reset"
              icon="lucide:rotate-ccw"
              variant="outline"
              color="warning"
              :disabled="!hasFormChanges"
              @click="handleReset"
            />
            <UButton
              v-if="canUpdateSetting"
              label="Save"
              icon="lucide:save"
              variant="solid"
              color="primary"
              type="submit"
              :loading="saveLoading"
              :disabled="!hasFormChanges"
            />
          </div>
        </UForm>
      </div>
    </div>

    <div class="general-settings-card surface-card">
      <div class="general-settings-card-inner">
        <div class="general-settings-card-header">
          <h3>
            CORS Allowed Origins
          </h3>
          <p>
            Manage the list of origins allowed to call the API. Changes take
            effect immediately.
          </p>
        </div>
        <CommonCorsOriginList />
      </div>
    </div>
  </div>
</template>

<style scoped>
.general-settings-page {
  display: grid;
  gap: 18px;
}

.general-settings-card {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-card);
  backdrop-filter: blur(18px);
}

.general-settings-card-inner {
  position: relative;
  padding: 22px;
}

.general-settings-card-header {
  margin-bottom: 18px;
}

.general-settings-card-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0;
}

.general-settings-card-header p {
  margin: 4px 0 0;
  color: var(--text-tertiary);
  font-size: 14px;
  font-weight: 600;
}

.general-settings-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
  border-top: 1px solid var(--border-subtle);
  padding-top: 18px;
}

@media (max-width: 640px) {
  .general-settings-card-inner {
    padding: 16px;
  }
}
</style>
