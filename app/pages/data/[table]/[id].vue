<script setup lang="ts">
const route = useRoute();

const notify = useNotify();
const tableName = route.params.table as string;
const { schemas, useFormChanges } = useSchema(tableName);
const { validateForm } = useFormValidation(tableName);
const { getId, getIdFieldName } = useDatabase();
const updateErrors = ref<Record<string, string>>({});

const schema = computed(() => schemas.value[tableName]);
const isSingleRecord = computed(() => schema.value?.isSingleRecord === true);

const { confirm } = useConfirm();

const hasFormChanges = ref(false);
const formEditorRegistry = useFormEditorRegistry();
const formChanges = useFormChanges();

const { getRouteForTableName, ensureRoutesLoaded } = useRoutes();
const { registerPageHeader } = usePageHeaderRegistry();

const currentRecord = ref<Record<string, any>>({});

const currentRecordRouteId = computed(() => {
  const p = route.params.id;
  if (Array.isArray(p)) return p[0] ?? null;
  return p ?? null;
});

onMounted(async () => {
  await ensureRoutesLoaded();
  await initializeForm();
});

watch(() => getId(currentRecord.value), (id) => {
  if (id) {
    registerPageHeader({
      title: `${route.params.table}: ${id}`,
      gradient: "cyan",
    });
  }
}, { immediate: true });

const {
  data: apiData,
  pending: loading,
  execute: fetchRecord,
} = useApi(() => getRouteForTableName(tableName), {
  query: computed(() => ({
    fields: "*",
    filter: {
      [getIdFieldName()]: {
        _eq: route.params.id,
      },
    },
  })),
  errorContext: "Fetch Record",
});

async function initializeForm() {
  await fetchRecord();
  const data = apiData.value?.data?.[0];
  if (data) {
    currentRecord.value = { ...data };
    formChanges.update(data);
  }
}

async function handleUpdate() {
  if (!await validateForm(currentRecord.value, updateErrors)) return;

  await updateRecord({
    id: route.params.id as string,
    body: currentRecord.value,
  });

  if (updateError.value) {
    return;
  }

  await fetchRecord();
  const data = apiData.value?.data?.[0];
  if (data) {
    currentRecord.value = { ...data };
    formChanges.update(data);
    hasFormChanges.value = false;
    formEditorRegistry.value?.confirmChanges();
  }

  notify.success("Success", "Record updated!");
  updateErrors.value = {};
}

const {
  pending: updateLoading,
  execute: updateRecord,
  error: updateError,
} = useApi(() => getRouteForTableName(tableName), {
  method: "patch",
  errorContext: "Update Record",
});

const {
  error: deleteError,
  execute: executeDeleteRecord,
  pending: deleteLoading,
} = useApi(() => getRouteForTableName(tableName), {
  method: "delete",
  errorContext: "Delete Record",
});

async function deleteRecord() {
  const ok = await confirm({
    title: "Are you sure?",
    content: "This action cannot be undone.",
  });
  if (!ok) return;

  await executeDeleteRecord({ id: route.params.id as string });

  if (deleteError.value) {
    return;
  }

  notify.success("Record deleted");
  await navigateTo(`/data/${route.params.table}`);
}

async function handleReset() {
  const ok = await confirm({
    title: "Reset Changes",
    content: "Are you sure you want to discard all changes? All modifications will be lost.",
  });
  if (!ok) {
    return;
  }

  if (formChanges.originalData.value) {
    currentRecord.value = formChanges.discardChanges(currentRecord.value);
    hasFormChanges.value = false;
    
    notify.success("Reset Complete", "All changes have been discarded.");
  }
}

useHeaderActionRegistry([
  {
    id: "reset-data-entry",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    order: 1,
    disabled: computed(() => !hasFormChanges.value),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "delete-data-entry",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    size: "md",
    order: 2,
    loading: computed(() => deleteLoading.value),
    onClick: deleteRecord,
    show: computed(() => !isSingleRecord.value),
    permission: {
      and: [
        {
          route: getRouteForTableName(tableName),
          actions: ["delete"],
        },
      ],
    },
  },
  {
    id: "save-data-entry",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    order: 999,
    loading: computed(() => updateLoading.value),
    disabled: computed(() => !hasFormChanges.value),
    submit: handleUpdate,
    permission: {
      and: [
        {
          route: getRouteForTableName(tableName),
          actions: ["update"],
        },
      ],
    },
  },
]);
</script>

<template>
  <div class="space-y-6">
    
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <FormEditorLazy
          :table-name="(route.params.table as string)"
          mode="update"
          v-model="currentRecord"
          v-model:errors="updateErrors"
          @has-changed="(hasChanged) => hasFormChanges = hasChanged"
          :loading="loading"
          :current-record-id="currentRecordRouteId"
        />
      </CommonFormCard>
    </div>
  </div>
</template>
