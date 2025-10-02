<template>
  <div class="space-y-6">
    <!-- Header -->
    <CommonPageHeader
      title="Create New Bootstrap Script"
      title-size="lg"
      show-background
      background-gradient="from-amber-500/6 via-orange-400/4 to-transparent"
      padding-y="py-6"
    />

    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <div class="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            v-model:errors="createErrors"
            :excluded="['createdBy', 'updatedBy']"
          />
        </UForm>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const toast = useToast();

const tableName = "bootstrap_script_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const { generateEmptyForm, validate } = useSchema(tableName);

useHeaderActionRegistry([
  {
    id: "save-bootstrap",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    submit: handleCreate,
    loading: computed(() => createLoading.value),
    permission: {
      and: [
        {
          route: "/bootstrap_script_definition",
          actions: ["create"],
        },
      ],
    },
  },
]);

// Setup useApi composable at top level
const {
  data: createData,
  error: createError,
  execute: executeCreateScript,
  pending: createLoading,
} = useApi(() => `/${tableName}`, {
  method: "post",
  errorContext: "Create Bootstrap Script",
});

onMounted(() => {
  createForm.value = generateEmptyForm();
  // Set createdBy to current user
  const { me } = useEnfyraAuth();
  if (me.value?.id) {
    createForm.value.createdBy = { id: me.value.id };
  }
});

async function handleCreate() {
  const { isValid, errors } = validate(createForm.value);

  if (!isValid) {
    createErrors.value = errors;
    toast.add({
      title: "Missing information",
      description: "Please fill in all required fields.",
      color: "error",
    });
    return;
  }

  await executeCreateScript({ body: createForm.value });

  if (createError.value) {
    return;
  }

  toast.add({
    title: "Bootstrap script created successfully",
    color: "success",
  });

  await navigateTo(`/settings/bootstrap/${createData.value.data[0].id}`, {
    replace: true,
  });
}
</script>
