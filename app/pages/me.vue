<script setup lang="ts">
const toast = useToast();
const { confirm } = useConfirm();
const { validate } = useSchema("user_definition");
const { me } = useEnfyraAuth();

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Profile",
  description: "Update your personal information",
  variant: "default",
  gradient: "blue",
});

const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();

const {
  data: apiData,
  pending: loading,
  execute: fetchMe,
} = useApi(() => `/me`, {
  query: {
    fields: "*",
  },
  errorContext: "Load Profile",
});

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});

const fieldMap = computed(() => ({
  email: {
    disabled: true
  },
  role: {
    permission: {
      and: [
        { route: '/user_definition', actions: ['update'] }
      ]
    }
  }
}));

async function initializeForm() {
  await fetchMe();
  const data = apiData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
    formChanges.update(data);
  }
}

const {
  execute: updateProfile,
  pending: updateLoading,
  error: updateError,
} = useApi(() => `/me`, {
  method: "patch",
  errorContext: "Update Profile",
});

async function handleReset() {
  const ok = await confirm({
    title: "Reset Changes",
    content: "Are you sure you want to discard all changes? All modifications will be lost.",
  });
  if (!ok) {
    return;
  }

  if (formChanges.originalData.value) {
    form.value = formChanges.discardChanges(form.value);
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
    id: "reset-profile",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    disabled: computed(() => !hasFormChanges.value),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "save-profile",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    loading: computed(() => updateLoading.value),
    disabled: computed(() => !hasFormChanges.value),
    submit: saveProfile,
  },
]);

async function saveProfile() {
  if (!form.value) return;

  const { isValid, errors: validationErrors } = validate(form.value);
  if (!isValid) {
    errors.value = validationErrors;
    toast.add({
      title: "Missing information",
      description: "Please fill in all required fields.",
      color: "error",
    });
    return;
  }

  await updateProfile({ body: form.value });

  if (updateError.value) {
    return;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "Profile updated successfully!",
  });
  errors.value = {};

  await fetchMe();
  const updatedData = apiData.value?.data?.[0];
  if (updatedData) {
    form.value = { ...updatedData };
  }

  formEditorRef.value?.confirmChanges();
  formChanges.update(form.value);
}

onMounted(() => {
  initializeForm();
});
</script>

<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="form" @submit="saveProfile">
          <FormEditorLazy
            ref="formEditorRef"
            v-model="form"
            v-model:errors="errors"
            @has-changed="(hasChanged) => hasFormChanges = hasChanged"
            table-name="user_definition"
            :excluded="['isRootAdmin', 'isSystem', 'allowedRoutePermissions', 'createdAt', 'updatedAt']"
            :field-map="fieldMap"
            :loading="loading"
            mode="update"
          />
        </UForm>
      </CommonFormCard>
    </div>

    <CommonEmptyState
      v-if="!loading && !apiData?.data?.[0]"
      title="Profile not found"
      description="Unable to load your profile information"
      icon="lucide:user-x"
      size="sm"
    />
  </div>
</template>

