<template>
  <div class="space-y-6">
    <div class="eapp-page-constrained">
      <CommonFormCard>
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            :errors="createErrors"
            :excluded="['steps', 'triggers']"
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

const { ensureSchema, generateEmptyForm } = useSchema(tableName);
const { validateForm } = useFormValidation(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

const createFieldMap = computed(() => ({}));

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
  await ensureSchema();
  createForm.value = generateEmptyForm();
});

async function handleCreate() {
  if (!await validateForm(createForm.value, createErrors)) return;

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
