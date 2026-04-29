<script setup lang="ts">
const route = useRoute();
const notify = useNotify();
const newRecord = ref<Record<string, any>>({});
const tableName = route.params.table as string;
const { generateEmptyForm } = useSchema(tableName);
const { validateForm } = useFormValidation(tableName);
const createErrors = ref<Record<string, string>>({});
const { getId } = useDatabase();

const { getRouteForTableName, ensureRoutesLoaded } = useRoutes();
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: `Create New ${route.params.table} Record`,
  gradient: "cyan",
});

onMounted(async () => {
  await ensureRoutesLoaded();
  newRecord.value = generateEmptyForm();
});

const {
  data: createData,
  pending: createLoading,
  execute: createRecord,
  error: createError,
} = useApi(() => getRouteForTableName(tableName), {
  method: "post",
  errorContext: "Create Record",
});

useHeaderActionRegistry([
  {
    id: "save-data-entry",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    order: 999,
    loading: computed(() => createLoading.value),
    submit: handleCreate,
    permission: {
      and: [
        {
          route: getRouteForTableName(tableName),
          actions: ["create"],
        },
      ],
    },
  },
]);

async function handleCreate() {
  if (!await validateForm(newRecord.value, createErrors)) return;

  const response = await createRecord({ body: newRecord.value });

  if (createError.value) {
    return;
  }

  const createdRecord = extractCreatedRecord(response ?? createData.value);
  const createdId = getId(createdRecord);
  if (createdId == null || String(createdId) === "") {
    notify.error("Create failed", "The created record response did not include an id.");
    return;
  }

  notify.success("Success", "New record created!");

  await navigateTo(
    `/data/${route.params.table}/${createdId}`,
    { replace: true }
  );
}
</script>

<template>
  <div class="space-y-6">
    
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="newRecord" @submit="handleCreate">
          <FormEditorLazy
            :table-name="(route.params.table as string)"
            mode="create"
            v-model="newRecord"
            v-model:errors="createErrors"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>
</template>
