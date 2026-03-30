<template>
  <div class="space-y-6">
    <div class="w-full max-w-[1000px]">
      <CommonFormCard>
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            :errors="createErrors"
            :excluded="['steps']"
            :field-map="createFieldMap"
            @update:errors="(errors) => (createErrors = errors)"
            mode="create"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  title: "Create Flow",
});

const toast = useToast();
const router = useRouter();

const tableName = "flow_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const { generateEmptyForm } = useSchema(tableName);
const { validateForm } = useFormValidation(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

const TriggerConfigEditor = resolveComponent('FlowTriggerConfigEditor');
const createFieldMap = computed(() => ({
  triggerConfig: {
    label: 'Trigger Configuration',
    hideDescription: true,
    component: TriggerConfigEditor,
    componentProps: { triggerType: createForm.value.triggerType },
  },
}));

registerPageHeader({
  title: "Create New Flow",
  gradient: "purple",
});

useHeaderActionRegistry([
  {
    id: "save-flow",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    submit: handleCreate,
    loading: computed(() => createLoading.value),
    permission: {
      and: [{ route: "/flow_definition", actions: ["create"] }],
    },
  },
]);

const {
  data: createData,
  error: createError,
  execute: executeCreateFlow,
  pending: createLoading,
} = useApi(() => `/flow_definition`, {
  method: "post",
  errorContext: "Create Flow",
});

onMounted(async () => {
  createForm.value = generateEmptyForm();
});

async function handleCreate() {
  if (!await validateForm(createForm.value, createErrors)) return;

  if (createForm.value.triggerType === 'schedule' && !createForm.value.triggerConfig?.cron) {
    createErrors.value.triggerConfig = 'Cron expression is required for schedule trigger';
    return;
  }

  const body = { ...createForm.value };

  await executeCreateFlow({ body });

  if (createError.value) {
    toast.add({
      title: "Error",
      description: createError.value.message,
      color: "error",
    });
    return;
  }

  toast.add({
    title: "Success",
    description: `Flow "${createForm.value.name}" has been created successfully!`,
    color: "success",
  });

  const createdId = createData.value?.data?.[0]?.id;
  router.push(createdId ? `/settings/flows/${createdId}` : '/settings/flows');
}
</script>
