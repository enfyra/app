<template>
  <div class="space-y-6">
    <div class="eapp-page-constrained">
      <CommonFormCard>
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            v-model:errors="createErrors"
            :excluded="['createdAt', 'updatedAt', 'children', 'rules', 'parent']"
            :field-map="fieldMap"
            :sections="guardFormSections"
            mode="create"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
const notify = useNotify();
const tableName = 'enfyra_guard';

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const { ensureSchema, generateEmptyForm } = useSchema(tableName);
const { validateForm } = useFormValidation(tableName);
const { registerPageHeader } = usePageHeaderRegistry();
const { getId } = useDatabase();

const isGlobalGuardForm = computed(() => createForm.value?.isGlobal === true);
const isGraphqlGuardForm = computed(() => createForm.value?.type === 'graphql');

const fieldMap = computed(() => ({
  name: { label: 'Name' },
  description: { label: 'Description' },
  type: {
    label: 'Guard target',
    description: 'Choose whether this guard protects REST routes or GraphQL operations.',
    component: resolveComponent('GuardTargetTypePicker'),
  },
  position: { component: resolveComponent('GuardPositionPicker') },
  combinator: { component: resolveComponent('GuardCombinatorPicker') },
  route: {
    excluded: isGlobalGuardForm.value || isGraphqlGuardForm.value,
    description: 'Choose the REST route protected by this guard.',
  },
  methods: {
    type: 'methods-selector',
    excluded: isGlobalGuardForm.value || isGraphqlGuardForm.value,
    description: 'Leave empty to protect every HTTP method on the selected route.',
  },
  isGlobal: {
    label: 'All routes',
    description: 'Apply this guard to every REST route.',
    excluded: isGraphqlGuardForm.value,
  },
  gqlOperation: {
    label: 'Operation',
    description: 'Choose one GraphQL operation, or keep All operations selected.',
    component: resolveComponent('GuardOperationPicker'),
    excluded: !isGraphqlGuardForm.value,
  },
  table: {
    label: 'Table',
    description: 'Choose one table, or leave empty to protect all GraphQL tables.',
    excluded: !isGraphqlGuardForm.value,
  },
}));

registerPageHeader({
  title: 'Create New Guard',
  gradient: 'purple',
});

registerHeaderActions([
  {
    id: 'save-guard',
    label: 'Save',
    icon: 'lucide:save',
    variant: 'solid',
    color: 'primary',
    size: 'md',
    order: 999,
    submit: handleCreate,
    loading: computed(() => createLoading.value),
    permission: {
      and: [
        {
          route: '/enfyra_guard',
          methods: ['POST'],
        },
      ],
    },
  },
]);

const {
  data: createData,
  error: createError,
  execute: executeCreate,
  pending: createLoading,
} = useApi(() => `/${tableName}`, {
  method: 'post',
  errorContext: 'Create Guard',
});

onMounted(async () => {
  await ensureSchema();
  createForm.value = generateEmptyForm();
});

watch(
  () => createForm.value?.isGlobal,
  (isGlobal) => {
    if (!isGlobal) return;
    createForm.value = normalizeGuardTargetPayload(createForm.value);
    delete createErrors.value.route;
    delete createErrors.value.methods;
  },
);

watch(
  () => createForm.value?.type,
  (type) => {
    createForm.value = normalizeGuardTargetPayload(createForm.value);
    if (type === 'graphql') {
      delete createErrors.value.route;
      delete createErrors.value.methods;
      delete createErrors.value.isGlobal;
    } else {
      delete createErrors.value.gqlOperation;
      delete createErrors.value.table;
    }
  },
);

async function handleCreate() {
  const body = normalizeGuardTargetPayload(createForm.value);

  if (!(await validateForm(body, createErrors))) return;

  await executeCreate({ body });

  if (createError.value) return;

  notify.success('Guard created successfully');

  await navigateTo(`/settings/guards/${getId(createData.value.data[0])}`, {
    replace: true,
  });
}
</script>
