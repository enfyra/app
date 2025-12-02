<script setup lang="ts">

const { schemas, fetchSchema, schemaLoading } = useSchema();
const { confirm } = useConfirm();
const toast = useToast();
const { registerDataMenuItems } = useMenuRegistry();
const { loadRoutes } = useRoutes();
const { getId } = useDatabase();
const errors = ref<Record<string, string>>({});
const table = reactive<any>({
  name: "",
  description: "",
  columns: [],
  relations: [],
  uniques: [],
  indexes: [],
});
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Create New Table",
  gradient: "purple",
});

const nameError = ref<string | null>(null);

watch(
  () => table.name,
  (newVal) => {
    // Only validate when user has interacted with the input
    const name = newVal.trim();
    if (name === "") nameError.value = "Table name is required";
    else if (!TABLE_NAME_FIELD_REGEX.test(name))
      nameError.value =
        "Use letters (a-z, A-Z), numbers and underscore. Must start with a letter.";
    else if (name === "table") nameError.value = "Table name cannot be `table`";
    else nameError.value = "";
  }
);

function validateColumn(col: any) {
  if (!col.name?.trim()) {
    errors.value["name"] = "Column name is required";
  } else if (col.name.trim() === '_id') {
    delete errors.value["name"];
  } else if (!TABLE_NAME_FIELD_REGEX.test(col.name.trim())) {
    errors.value["name"] = "Invalid name";
  } else {
    delete errors.value["name"];
  }

  if (!col.type?.trim()) {
    errors.value["type"] = "Must select data type";
  } else {
    delete errors.value["type"];
  }
}

function validateRelation(rel: any) {
  if (!rel.propertyName?.trim()) {
    errors.value.propertyName = "Relation name is required";
    return false;
  } else if (!TABLE_NAME_FIELD_REGEX.test(rel.propertyName.trim())) {
    errors.value.propertyName = "Invalid name";
    return false;
  }

  if (!rel.type?.trim()) {
    errors.value.type = "Must select relation type";
    return false;
  }

  if (!rel.targetTable) {
    errors.value.targetTable = "Must select target table";
    return false;
  }

  delete errors.value.propertyName;
  delete errors.value.type;
  delete errors.value.targetTable;
  return true;
}

function validateAll() {
  errors.value = {};

  // Validate table name
  const name = table.name.trim();
  if (name === "") {
    errors.value["name"] = "Table name is required";
  } else if (!TABLE_NAME_FIELD_REGEX.test(name)) {
    errors.value["name"] = "Use letters (a-z, A-Z), numbers and underscore. Must start with a letter.";
  } else if (name === "table") {
    errors.value["name"] = "Table name cannot be `table`";
  }

  const { isMongoDB } = useDatabase();
  if (!isMongoDB.value && table.columns.length === 0 && table.relations.length === 0) {
    errors.value["fields"] = "At least one column or relation is required";
    toast.add({
      title: "Validation Error",
      color: "error",
      description: "Please add at least one column or relation to the table",
    });
  }

  // Call validate for each column and relation
  for (const col of table.columns) {
    validateColumn(col); // auto-assign to error.value
  }

  for (const rel of table.relations) {
    validateRelation(rel);
  }

  // If error still empty → valid
  return Object.keys(errors.value).length === 0;
}

function getCleanTablePayload() {
  const clone = JSON.parse(JSON.stringify(table));
  if (!clone.uniques?.length) delete clone.uniques;
  if (!clone.indexes?.length) delete clone.indexes;
  return clone;
}

const {
  data: createData,
  pending: createLoading,
  execute: createTable,
  error: createError,
} = useApi("/table_definition", {
  method: "post",
  errorContext: "Create Table",
});

useHeaderActionRegistry([
  {
    id: "create-table",
    label: "Create New Table",
    icon: "lucide:plus",
    variant: "solid",
    color: "primary",
    size: "md",
    loading: computed(() => createLoading.value || schemaLoading.value),
    submit: save,
    disabled: computed(() => schemaLoading.value),
    permission: {
      and: [
        {
          route: "/table_definition",
          actions: ["create"],
        },
      ],
    },
  },
]);

async function save() {
  if (!validateAll()) return;

  const ok = await confirm({ content: "Are u sure?" });
  if (!ok) {
    return;
  }

  const payload = getCleanTablePayload();
  await createTable({ body: payload });

  if (createError.value) {
    return;
  }

  // Fetch schema first to get updated tables
  await fetchSchema();

  // Reload routes to include the new table's route
  await loadRoutes();

  // Wait a bit to ensure schemas.value is updated
  await nextTick();

  // Re-register all table menus to ensure sync
  await registerDataMenuItems(Object.values(schemas.value));

  toast.add({
    title: "Success",
    color: "success",
    description: "New table created!",
  });

  // Get the newly created table name from response
  const newTableName = createData.value?.data?.[0]?.name;
  if (newTableName) {
    await navigateTo(`/collections/${newTableName}`, { replace: true });
  } else {
    await navigateTo("/collections", { replace: true });
  }
}
</script>

<template>
  <div class="relative">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <TableForm v-model="table" :new="true">
          <template #tableName>
            <div class="mb-6">
              <UFormField
                :error="nameError && nameError !== '' ? nameError : undefined"
                label="Table Name"
              >
                <UInput
                  v-model="table.name"
                  placeholder="Enter table name"
                  class="w-full"
                  size="lg"
                />
              </UFormField>
            </div>
          </template>
          <div class="space-y-6">
            <TableConstraints
              v-model="table"
              :column-names="table.columns.map((c: any) => c.name)"
            />
            <TableColumns v-model="table.columns" />
            <TableRelations
              v-model="table.relations"
              :table-options="
                Object.values(schemas).map((schema: any) => ({ 
                  label: schema.name, 
                  value: getId(schema)
                }))
              "
            />
          </div>
        </TableForm>
      </CommonFormCard>
    </div>
  </div>
</template>
