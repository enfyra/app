<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            v-model:errors="createErrors"
            :excluded="['createdAt', 'updatedAt', 'children', 'rules', 'parent']"
            :field-map="fieldMap"
            mode="create"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const notify = useNotify();
const tableName = 'guard_definition';

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const { generateEmptyForm } = useSchema(tableName);
const { validateForm } = useFormValidation(tableName);
const { registerPageHeader } = usePageHeaderRegistry();
const { getId } = useDatabase();

const fieldMap = {
  position: { component: resolveComponent('GuardPositionPicker') },
  combinator: { component: resolveComponent('GuardCombinatorPicker') },
  methods: { type: 'methods-selector', componentProps: { excludeGqlMethods: true } },
};

registerPageHeader({
  title: 'Create New Guard',
  gradient: 'purple',
});

useHeaderActionRegistry([
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
          route: '/guard_definition',
          actions: ['create'],
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

onMounted(() => {
  createForm.value = generateEmptyForm();
});

async function handleCreate() {
  const body = { ...createForm.value };

  if (!(await validateForm(body, createErrors))) return;

  await executeCreate({ body });

  if (createError.value) return;

  notify.success('Guard created successfully');

  await navigateTo(`/settings/guards/${getId(createData.value.data[0])}`, {
    replace: true,
  });
}
</script>
