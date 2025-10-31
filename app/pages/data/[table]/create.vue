<script setup lang="ts">
const route = useRoute();
const toast = useToast();
const newRecord = ref<Record<string, any>>({});
const tableName = route.params.table as string;
const { generateEmptyForm, validate } = useSchema(tableName);
const createErrors = ref<Record<string, string>>({});
const { getId } = useDatabase();

// Get the correct route for this table
const { getRouteForTableName, ensureRoutesLoaded } = useRoutes();
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: `Create New ${route.params.table} Record`,
  gradient: "cyan",
});

// Load routes on mount
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
  const { isValid, errors } = validate(newRecord.value);

  if (!isValid) {
    createErrors.value = errors;
    toast.add({
      title: "Missing information",
      color: "error",
      description: "Please fill in all required fields.",
    });
    return;
  }

  await createRecord({ body: newRecord.value });

  if (createError.value) {
    return;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "New record created!",
  });

  await navigateTo(
    `/data/${route.params.table}/${getId(createData.value?.data[0])}`,
    { replace: true }
  );
}
</script>

<template>
  <div class="space-y-6">
    <!-- Content - Limited width -->
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
