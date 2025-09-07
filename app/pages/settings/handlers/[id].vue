<template>
  <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full space-y-6">
    <div class="space-y-6">
      <!-- Header - Full width -->
      <CommonPageHeader
        title="Handler Details"
        title-size="lg"
        show-background
        background-gradient="from-emerald-500/6 via-teal-400/4 to-transparent"
        padding-y="py-6"
      />

      <!-- Content - Limited width -->
      <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
        <div class="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
          <UForm :state="form" @submit="save">
            <FormEditorLazy
              ref="formEditorRef"
              v-model="form"
              v-model:errors="errors"
              v-model:has-changes="hasFormChanges"
              :table-name="tableName"
              :loading="loading"
            />
          </UForm>
        </div>
      </div>
    </div>

    <CommonEmptyState
      v-if="!loading && !handlerData?.data?.[0]"
      title="Handler not found"
      description="The requested handler could not be loaded"
      icon="lucide:command-x"
      size="sm"
    />
  </div>
</template>

<script setup lang="ts">

const route = useRoute();
const toast = useToast();
const { confirm } = useConfirm();

const id = route.params.id as string;
const tableName = "route_handler_definition";
const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});

// Form changes tracking via FormEditor
const hasFormChanges = ref(false);
const formEditorRef = ref();

const { validate, getIncludeFields } = useSchema(tableName);

useHeaderActionRegistry([
  {
    id: "save-handler",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    submit: save,
    loading: computed(() => saveLoading.value),
    disabled: computed(() => form.value?.isSystem || !hasFormChanges.value),
    permission: {
      and: [
        {
          route: "/route_handler_definition",
          actions: ["update"],
        },
      ],
    },
  },
  {
    id: "delete-handler",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    size: "md",
    onClick: deleteHandler,
    loading: computed(() => deleteLoading.value),
    disabled: computed(() => form.value?.isSystem || false),
    permission: {
      and: [
        {
          route: "/route_handler_definition",
          actions: ["delete"],
        },
      ],
    },
  },
]);

const {
  data: handlerData,
  pending: loading,
  execute: executeGetHandler,
} = useEnfyraApi(`/${tableName}`, {
  query: { fields: getIncludeFields(), filter: { id: { _eq: id } } },
  errorContext: "Fetch Handler",
});

const {
  error: saveError,
  execute: executeSaveHandler,
  pending: saveLoading,
} = useEnfyraApi(`/${tableName}`, {
  method: "patch",
  errorContext: "Save Handler",
});

const {
  error: deleteError,
  execute: executeDeleteHandler,
  pending: deleteLoading,
} = useEnfyraApi(`/${tableName}`, {
  method: "delete",
  errorContext: "Delete Handler",
});

// Initialize form data
async function initializeForm() {
  await executeGetHandler();
  const data = handlerData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
  }
}

async function save() {
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

  await executeSaveHandler({ id, body: form.value });

  if (saveError.value) {
    return;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "Handler updated!",
  });
  errors.value = {};

  // Confirm form changes as new baseline
  formEditorRef.value?.confirmChanges();
}

async function deleteHandler() {
  const ok = await confirm({
    title: "Are you sure?",
    content: "This action cannot be undone.",
  });
  if (!ok) return;

  await executeDeleteHandler({ id });

  if (deleteError.value) {
    return;
  }

  toast.add({ 
    title: "Success",
    description: "Handler deleted successfully", 
    color: "success" 
  });
  await navigateTo("/settings/handlers");
}

onMounted(() => {
  initializeForm();
});
</script>
