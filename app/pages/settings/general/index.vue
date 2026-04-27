<script setup lang="ts">
const notify = useNotify();
const { confirm } = useConfirm();
const { checkPermissionCondition } = usePermissions();
const { getIdFieldName } = useDatabase();
const errors = ref<Record<string, string>>({});

const { validateForm } = useFormValidation("setting_definition");

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
    and: [{ route: "/setting", actions: ["update"] }],
  })
);

const {
  data: apiData,
  pending: loading,
  execute: loadSetting,
} = useApi(() => `/setting_definition`, {
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
    class: "border-b border-[var(--border-subtle)] pb-8",
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
} = useApi(() => `/setting_definition/${getId(setting.value)}`, {
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
  <div class="max-w-[1000px] space-y-6 pb-10 lg:px-0">
    <div class="surface-card overflow-hidden rounded-2xl">
      <div class="relative px-6 py-8 sm:px-8">
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
            table-name="setting_definition"
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

          <div
            class="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-6"
          >
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

    <div class="surface-card overflow-hidden rounded-2xl">
      <div class="relative px-6 py-8 sm:px-8">
        <div class="mb-6">
          <h3 class="mb-1 text-lg font-semibold text-[var(--text-primary)]">
            CORS Allowed Origins
          </h3>
          <p class="text-sm text-[var(--text-tertiary)]">
            Manage the list of origins allowed to call the API. Changes take
            effect immediately.
          </p>
        </div>
        <CommonCorsOriginList />
      </div>
    </div>
  </div>
</template>
