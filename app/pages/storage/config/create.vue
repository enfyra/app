<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            :errors="createErrors"
            @update:errors="(errors) => (createErrors = errors)"
            :excluded="excludedFields"
            :includes="includedFields.length > 0 ? includedFields : undefined"
            :type-map="typeMap"
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
  title: "Create Storage Configuration",
});

const toast = useToast();
const { me } = useEnfyraAuth();
const { getIdFieldName } = useDatabase();
const { fetchStorageConfigs: fetchGlobalStorageConfigs } = useGlobalState();

const tableName = "storage_config_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const { generateEmptyForm, validate, definition } = useSchema(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

const typeMap = computed(() => {
  return {
    type: {
      excludedOptions: ['Local Storage'],
    },
  };
});

const excludedFields = computed(() => {
  const baseExcluded = ['createdBy', 'updatedBy', 'isEnabled'];
  const selectedType = createForm.value.type;
  
  if (!selectedType) {
    return baseExcluded;
  }
  
  const typeFieldMap: Record<string, string[]> = {
    'Google Cloud Storage': ['accessKeyId', 'secretAccessKey', 'accountId', 'region'],
    'Cloudflare R2': ['credentials', 'region'],
    'Amazon S3': ['credentials', 'accountId'],
    'Local Storage': ['accessKeyId', 'secretAccessKey', 'accountId', 'region', 'credentials', 'bucket'],
  };
  
  const fieldsToExclude = typeFieldMap[selectedType] || [];
  return [...baseExcluded, ...fieldsToExclude];
});

const includedFields = computed(() => {
  const selectedType = createForm.value.type;
  if (!selectedType) {
    return ['name', 'bucket', 'description', 'type'];
  }
  return [];
});

registerPageHeader({
  title: "Create Storage Configuration",
  gradient: "blue",
});

useHeaderActionRegistry({
  id: "save-storage-config",
  label: "Save",
  icon: "lucide:save",
  variant: "solid",
  color: "primary",
  submit: handleCreate,
  loading: computed(() => createLoading.value),
  permission: {
    and: [
      {
        route: "/storage_config_definition",
        actions: ["create"],
      },
    ],
  },
});

const {
  data: createData,
  error: createError,
  execute: executeCreateConfig,
  pending: createLoading,
} = useApi(() => `/${tableName}`, {
  method: "post",
  errorContext: "Create Storage Configuration",
});

onMounted(() => {
  createForm.value = generateEmptyForm();
});

async function handleCreate() {
  const { isValid, errors } = validate(createForm.value);

  if (!isValid) {
    createErrors.value = errors;
    toast.add({
      title: "Error",
      description: "Please check the fields with errors.",
      color: "error",
    });
    return;
  }

  const idField = getIdFieldName();
  const body = {
    ...createForm.value,
    createdBy: { [idField]: me.value?.[idField] }
  };

  await executeCreateConfig({ body });

  if (createError.value) {
    return;
  }

  await fetchGlobalStorageConfigs();

  toast.add({
    title: "Storage configuration created successfully",
    color: "success",
  });

  const { getId } = useDatabase();
  await navigateTo(`/storage/config/${getId(createData.value.data[0])}`, {
    replace: true,
  });
}
</script>
