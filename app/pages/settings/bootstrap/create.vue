<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            v-model:errors="createErrors"
            :excluded="['createdBy', 'updatedBy']"
            mode="create"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const notify = useNotify();

const tableName = "bootstrap_script_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const { generateEmptyForm } = useSchema(tableName);
const { validateForm } = useFormValidation(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Create New Bootstrap Script",
  gradient: "purple",
});

useHeaderActionRegistry([
  {
    id: "save-bootstrap",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    order: 999,
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
  
  const { me } = useAuth();
  const { getId, getIdFieldName } = useDatabase();
  const userId = getId(me.value);
  if (userId) {
    createForm.value.createdBy = { [getIdFieldName()]: userId };
  }
});

async function handleCreate() {
  if (!await validateForm(createForm.value, createErrors)) return;

  await executeCreateScript({ body: createForm.value });

  if (createError.value) {
    return;
  }

  notify.success("Bootstrap script created successfully");

  const { getId } = useDatabase();
  await navigateTo(`/settings/bootstrap/${getId(createData.value.data[0])}`, {
    replace: true,
  });
}
</script>
