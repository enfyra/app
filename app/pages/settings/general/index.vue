<script setup lang="ts">
const toast = useToast();
const { confirm } = useConfirm();
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
    
    toast.add({
      title: "Reset Complete",
      color: "success",
      description: "All changes have been discarded.",
    });
  }
}

useHeaderActionRegistry([
  {
    id: "reset-settings",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    order: 1,
    disabled: computed(() => !hasFormChanges.value),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "save-settings",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    order: 999,
    submit: handleSaveSetting,
    loading: computed(() => saveLoading.value),
    disabled: computed(() => !hasFormChanges.value),
    permission: {
      and: [
        {
          route: "/setting",
          actions: ["update"],
        },
      ],
    },
  },
]);

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

const fieldMap = {
  corsAllowedOrigins: {
    type: "array-tags",
    fieldProps: { class: "col-span-2" },
    hint:
      "Full origins only (scheme, host, port). Example: https://app.example.com or http://localhost:3000. An empty list allows every origin (see server CORS rules).",
    placeholder: "https://your-app.example.com",
    emptyMessage:
      "No origins in the list. Any origin will be allowed until you add entries.",
    normalizeOrigin: true,
    monospace: true,
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
} = useApi(() => `/setting_definition/${setting.value.id}`, {
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

  toast.add({
    title: "Success",
    description: "Configuration saved successfully",
    color: "success",
  });
  errors.value = {};

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
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm @submit="handleSaveSetting" :state="setting">
          <FormEditorLazy
            ref="formEditorRef"
            table-name="setting_definition"
            mode="update"
            v-model="setting"
            v-model:errors="errors"
            @has-changed="(hasChanged) => hasFormChanges = hasChanged"
            :loading="loading"
            :excluded="['id', 'createdAt', 'updatedAt']"
            :field-map="fieldMap"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>
</template>
