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
const { register: registerHeaderActions } = useHeaderActionRegistry();
definePageMeta({
  layout: "default",
  title: "Create Flow",
});

const notify = useNotify();
const router = useRouter();

const tableName = "enfyra_flow";

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

registerHeaderActions([
  {
    id: "save-flow",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    order: 999,
    submit: handleCreate,
    loading: computed(() => createLoading.value),
    permission: {
      and: [{ route: "/enfyra_flow", methods: ["POST"] }],
    },
  },
]);

const {
  data: createData,
  error: createError,
  execute: executeCreateFlow,
  pending: createLoading,
} = useApi(() => `/enfyra_flow`, {
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
    return;
  }

  notify.success("Success", `Flow "${createForm.value.name}" has been created successfully!`);

  const createdId = createData.value?.data?.[0]?.id;
  router.push(createdId ? `/settings/flows/${createdId}` : '/settings/flows');
}
</script>
