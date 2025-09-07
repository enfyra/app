<script setup lang="ts">
const route = useRoute();
const { schemas, fetchSchema, schemaLoading } = useSchema();
const { confirm } = useConfirm();
const toast = useToast();
const { registerTableMenusWithSidebarIds } = useMenuRegistry();
const tableName = "table_definition";
const { getIncludeFields } = useSchema(tableName);
const { isTablet } = useScreen();
const { isMounted } = useMounted();

const table = ref<any>();

const {
  data: tableData,
  pending: loading,
  execute: fetchTableData,
} = useEnfyraApi(() => "/table_definition", {
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
} = useEnfyraApi(() => `/table_definition`, {
  method: "patch",
  body: computed(() => table.value),
  errorContext: "Update Table",
});

const {
  pending: deleting,
  execute: executeDeleteTable,
  error: deleteError,
} = useEnfyraApi(() => `/table_definition`, {
  method: "delete",
  errorContext: "Delete Table",
});

useHeaderActionRegistry([
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
        deleting.value
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
  {
    id: "delete-table",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
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

// Initialize form data
async function initializeForm() {
  await fetchTableData();
  const data = tableData.value?.data?.[0];
  if (data) {
    table.value = data;
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
  await executePatchTable({ id: table.value?.id });

  if (updateError.value) {
    return; // Error already handled by useEnfyraApi
  }

  await fetchSchema();

  registerTableMenusWithSidebarIds(Object.values(schemas.value));

  toast.add({
    title: "Success",
    color: "success",
    description: "Table structure updated!",
  });
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
  await executeDeleteTable({ id: table.value?.id });

  if (deleteError.value) {
    return; // Error already handled by useEnfyraApi
  }

  await fetchSchema();

  registerTableMenusWithSidebarIds(Object.values(schemas.value));

  toast.add({
    title: "Success",
    color: "success",
    description: "Table deleted!",
  });
  return navigateTo(`/collections`);
}

onMounted(() => {
  initializeForm();
});
</script>

<template>
  <div class="relative">
    <!-- Header -->
    <CommonPageHeader
      :title="table ? `Edit Table: ${table.name}` : 'Table Editor'"
      title-size="lg"
      show-background
      background-gradient="from-indigo-500/8 via-purple-400/5 to-transparent"
      padding-y="py-6"
    />
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
          <div class="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
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
                      value: { id: schema.id },
                    }))
                  "
                />
              </div>
            </TableForm>
          </div>
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
        :class="isTablet ? 'w-full' : 'min-w-2xl'"
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
