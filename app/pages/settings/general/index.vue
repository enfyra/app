<script setup lang="ts">
// useApi is auto-imported in Nuxt
const toast = useToast();
const errors = ref<Record<string, string>>({});

const { validate } = useSchema("setting_definition");

// Form changes tracking via FormEditor
const hasFormChanges = ref(false);
const formEditorRef = ref();

useHeaderActionRegistry([
  {
    id: "save-settings",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
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

// Initialize form data
async function initializeForm() {
  await loadSetting();
  const data = apiData.value?.data?.[0];
  setting.value = data ? { ...data } : {};
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

  const { isValid, errors: validationErrors } = validate(setting.value);
  if (!isValid) {
    errors.value = validationErrors;
    toast.add({
      title: "Missing information",
      description: "Please fill in all required fields.",
      color: "error",
    });
    return;
  }

  await saveSetting({ body: setting.value });

  if (saveError.value) {
    return;
  }

  toast.add({ 
    title: "Success",
    description: "Configuration saved successfully", 
    color: "success" 
  });
  errors.value = {};

  formEditorRef.value?.confirmChanges();
}

onMounted(() => {
  initializeForm();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header - Full width -->
    <CommonPageHeader
      title="General Settings"
      title-size="md"
      show-background
      background-gradient="from-teal-500/8 via-emerald-400/5 to-transparent"
      padding-y="py-6"
    />

    <!-- Content - Limited width -->
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <div class="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <UForm @submit="handleSaveSetting" :state="setting">
          <FormEditorLazy
            ref="formEditorRef"
            table-name="setting_definition"
            mode="edit"
            v-model="setting"
            v-model:errors="errors"
            v-model:has-changes="hasFormChanges"
            :loading="loading"
          />
        </UForm>
      </div>
    </div>
  </div>
</template>
