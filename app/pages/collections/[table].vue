<script setup lang="ts">
const route = useRoute();
const { schemas, fetchSchema, schemaLoading } = useSchema();
const { confirm } = useConfirm();
const toast = useToast();
const { registerDataMenuItems } = useMenuRegistry();
const { loadRoutes } = useRoutes();
const { getId } = useDatabase();
const tableName = "table_definition";
const { getIncludeFields } = useSchema(tableName);
const { isMobile, isTablet } = useScreen();
const { isMounted } = useMounted();

const table = ref<any>();
const hasFormChanges = ref(false);
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();
const { registerPageHeader } = usePageHeaderRegistry();

watch(() => table.value?.name, (name) => {
  if (name) {
    registerPageHeader({
      title: `Edit Table: ${name}`,
      gradient: "purple",
    });
  }
}, { immediate: true });

const {
  data: tableData,
  pending: loading,
  execute: fetchTableData,
} = useApi(() => "/table_definition", {
  query: computed(() => ({
    fields: getIncludeFields(),
    filter: {
      name: {
        _eq: route.params.table,
      },
    },
  })),
  errorContext: "Fetch Table Data",
});

const {
  pending: saving,
  execute: executePatchTable,
  error: updateError,
} = useApi(() => `/table_definition`, {
  method: "patch",
  errorContext: "Update Table",
});

const {
  pending: deleting,
  execute: executeDeleteTable,
  error: deleteError,
} = useApi(() => `/table_definition`, {
  method: "delete",
  errorContext: "Delete Table",
});

useHeaderActionRegistry([
  {
    id: "reset-table",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    disabled: computed(
      () =>
        schemaLoading.value ||
        saving.value ||
        deleting.value ||
        !hasFormChanges.value
    ),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "delete-table",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    loading: computed(() => deleting.value),
    disabled: computed(
      () =>
        (table.value?.isSystem &&
          !isSystemTableModifiable(table.value?.name)) ||
        schemaLoading.value ||
        saving.value
    ),
    onClick: handleDelete,
    permission: {
      and: [
        {
          route: "/table_definition",
          actions: ["delete"],
        },
      ],
    },
  },
  {
    id: "save-table",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    loading: computed(() => saving.value || schemaLoading.value),
    disabled: computed(
      () =>
        (table.value?.isSystem &&
          !isSystemTableModifiable(table.value?.name)) ||
        schemaLoading.value ||
        deleting.value ||
        !hasFormChanges.value
    ),
    submit: save,
    permission: {
      and: [
        {
          route: "/table_definition",
          actions: ["update"],
        },
      ],
    },
  },
]);

const showSchemaViewer = ref(false);

useSubHeaderActionRegistry([
  {
    id: "view-schema",
    label: "View Schema",
    icon: "lucide:database",
    variant: "outline",
    color: "secondary",
    size: "md",
    onClick: () => (showSchemaViewer.value = true),
  },
]);

async function initializeForm() {
  await fetchTableData();
  const data = tableData.value?.data?.[0];
  if (data) {
    table.value = data;
    formChanges.update(data); // Set original data
    hasFormChanges.value = false;
  }
}

async function save() {
  const ok = await confirm({
    content: "Are you sure you want to modify table structure?",
  });
  if (!ok) {
    return;
  }
  await patchTable();
}

async function patchTable() {
  await executePatchTable({ id: getId(table.value), body: table.value });

  if (updateError.value) {
    return; // Error already handled by useApi
  }

  await fetchSchema();

  // Reload routes to include updated table routes
  await loadRoutes();

  registerDataMenuItems(Object.values(schemas.value));

  // Refetch latest table data to ensure UI reflects server state
  await fetchTableData();
  const updatedData = tableData.value?.data?.[0];
  if (updatedData) {
    table.value = updatedData;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "Table structure updated!",
  });

  // Reset form changes after successful save
  formChanges.update(table.value);
  hasFormChanges.value = false;
}

async function handleReset() {
  const ok = await confirm({
    title: "Reset Changes",
    content: "Are you sure you want to discard all changes? All modifications will be lost.",
  });
  if (!ok) {
    return;
  }

  // Reset table to original state
  if (formChanges.originalData.value) {
    table.value = formChanges.discardChanges(table.value);
    hasFormChanges.value = false;
    
    toast.add({
      title: "Reset Complete",
      color: "success",
      description: "All changes have been discarded.",
    });
  }
}

async function handleDelete() {
  const ok = await confirm({
    content: `Are you sure you want to delete table ${table.value.name}?`,
  });
  if (!ok) {
    return;
  }

  await deleteTable();
}

async function deleteTable() {
  await executeDeleteTable({ id: getId(table.value) });

  if (deleteError.value) {
    return; // Error already handled by useApi
  }

  await fetchSchema();

  // Reload routes to remove deleted table routes
  await loadRoutes();

  registerDataMenuItems(Object.values(schemas.value));

  toast.add({
    title: "Success",
    color: "success",
    description: "Table deleted!",
  });
  return navigateTo(`/collections`);
}

// Watch for form changes
watch(
  () => table.value,
  (newValue) => {
    if (
      newValue &&
      Object.keys(newValue).length > 0 &&
      formChanges.originalData.value &&
      Object.keys(formChanges.originalData.value).length > 0
    ) {
      const hasChanged = formChanges.checkChanges(newValue);
      hasFormChanges.value = hasChanged;
    }
  },
  { deep: true }
);

onMounted(() => {
  initializeForm();
});
</script>

<template>
  <div class="relative">
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="!isMounted || loading"
        type="form"
        context="page"
        title="Loading table structure..."
        description="Fetching table definition and schema"
        size="sm"
      />

      <UForm v-else-if="table" @submit.prevent="save" :state="table">
        <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
          <CommonFormCard>
            <TableForm v-model="table" @save="save">
              <div class="space-y-6">
                <TableConstraints
                  v-model="table"
                  :column-names="table.columns?.map((c:any) => c?.name)"
                />
                <TableColumns v-model="table.columns" />
                <TableRelations
                  v-model="table.relations"
                  :table-options="
                    Object.values(schemas).map((schema: any) => ({
                      label: schema?.name,
                      value: getId(schema),
                    }))
                  "
                />
              </div>
            </TableForm>
          </CommonFormCard>
        </div>
      </UForm>

      <CommonEmptyState
        v-else
        title="Table not found"
        description="The requested table could not be loaded"
        icon="lucide:database"
        size="sm"
      />
    </Transition>

    <!-- Schema Viewer Modal -->
    <Teleport to="body">
      <UModal
        v-model:open="showSchemaViewer"
        :class="(isMobile || isTablet) ? 'w-full max-w-full' : 'min-w-2xl max-w-4xl'"
      >
        <template #header>
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl bg-gradient-to-br from-info to-primary flex items-center justify-center shadow-lg"
              >
                <UIcon name="lucide:database" class="text-sm text-white" />
              </div>
              <div>
                <h2 class="text-xl font-semibold text-foreground">
                  {{ table?.name }} Schema
                </h2>
                <p class="text-sm text-muted-foreground">
                  API Documentation & Structure
                </p>
              </div>
            </div>
            <UButton
              icon="lucide:x"
              @click="showSchemaViewer = false"
              variant="soft"
              color="error"
              size="lg"
            />
          </div>
        </template>
        <template #body>
          <CollectionSchemaViewer v-if="table?.name" :table-name="table.name" />
        </template>
      </UModal>
    </Teleport>
  </div>
</template>
