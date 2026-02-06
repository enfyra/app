<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            :errors="createErrors"
            :field-map="{
              connectionHandlerScript: {
                type: 'code',
                language: 'javascript',
                height: '400px',
                label: 'Connection Handler Script',
                description: 'JavaScript code to execute when client connects'
              },
              connectionHandlerTimeout: {
                type: 'number',
                label: 'Connection Handler Timeout (ms)',
                description: 'Timeout for connection handler execution (default: 5000ms)',
                placeholder: '5000'
              }
            }"
            @update:errors="(errors) => (createErrors = errors)"
            mode="create"
          />
        </UForm>
      </CommonFormCard>
    </div>

    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Target Tables
            </h3>
            <UButton
              icon="i-lucide-plus"
              size="sm"
              color="primary"
              variant="soft"
              @click="addTargetTable"
            >
              Add Table
            </UButton>
          </div>
        </template>

        <div v-if="selectedTargetTables.length > 0" class="space-y-2">
          <div
            v-for="(table, index) in selectedTargetTables"
            :key="index"
            class="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <span class="flex-1 text-sm">{{ table.name }}</span>
            <UButton
              icon="i-lucide-x"
              size="sm"
              color="error"
              variant="ghost"
              @click="removeTargetTable(index)"
            />
          </div>
        </div>

        <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
          No tables selected. Click "Add Table" to allow this WebSocket gateway to access data.
        </div>
      </CommonFormCard>
    </div>

    <UTable
      v-if="availableTables.length > 0 && showTableSelector"
      :rows="availableTables"
      :columns="tableColumns"
      :ui="{
        td: { base: 'first:rounded-l-lg last:rounded-r-lg' } as any
      }"
    >
      <template #name-data="{ row }">
        {{ (row as any).name }}
      </template>
      <template #actions-data="{ row }">
        <UButton
          icon="i-lucide-plus"
          size="xs"
          color="primary"
          variant="ghost"
          @click="addTable(row)"
        >
          Add
        </UButton>
      </template>
    </UTable>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  title: "Create WebSocket Gateway",
});

const toast = useToast();
const router = useRouter();
const { createLoader } = useLoader();

const tableName = "websocket_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});

const selectedTargetTables = ref<any[]>([]);
const availableTables = ref<any[]>([]);
const showTableSelector = ref(false);

const { generateEmptyForm, validate } = useSchema(tableName);
const { registerPageHeader } = usePageHeaderRegistry();
const { getId } = useDatabase();

registerPageHeader({
  title: "Create New WebSocket Gateway",
  gradient: "cyan",
});

const tableColumns: any[] = [
  { key: 'name', label: 'Table Name' },
  { key: 'actions', label: '' },
];

useHeaderActionRegistry([
  {
    id: "save-websocket",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    submit: handleCreate,
    loading: computed(() => createLoading.value),
    permission: {
      and: [
        {
          route: "/websocket_definition",
          actions: ["create"],
        },
      ],
    },
  },
  {
    id: "toggle-tables",
    label: "Select Tables",
    icon: "lucide:database",
    variant: "outline",
    color: "secondary",
    onClick: () => (showTableSelector.value = !showTableSelector.value),
  },
]);

const {
  data: createData,
  error: createError,
  execute: executeCreateGateway,
  pending: createLoading,
} = useApi(() => `/websocket_definition`, {
  method: "post",
  errorContext: "Create WebSocket Gateway",
});

const { data: tablesData, execute: fetchTables } = useApi(() => "/table_definition", {
  query: {
    fields: ["id", "name", "isSystem"],
    filter: { isSystem: { _eq: false } },
    limit: 100,
  },
});

const tableLoader = createLoader();

onMounted(async () => {
  createForm.value = generateEmptyForm();
  await fetchAvailableTables();
});

async function fetchAvailableTables() {
  await tableLoader.withLoading(async () => {
    await fetchTables();
    if (tablesData.value?.data) {
      availableTables.value = tablesData.value.data;
    }
  });
}

function addTargetTable() {
  showTableSelector.value = true;
}

function addTable(table: any) {
  if (!selectedTargetTables.value.find((t: any) => t.name === table.name)) {
    selectedTargetTables.value.push({ name: table.name, alias: '' });
  }
}

function removeTargetTable(index: number) {
  selectedTargetTables.value.splice(index, 1);
}

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

  const body = {
    ...createForm.value,
    targetTables: selectedTargetTables.value,
  };

  await executeCreateGateway({ body });

  if (createError.value) {
    toast.add({
      title: "Error",
      description: createError.value.message,
      color: "error",
    });
    return;
  }

  toast.add({
    title: "Success",
    description: `WebSocket gateway "${createForm.value.path}" has been created successfully!`,
    color: "success",
  });

  router.push('/settings/websockets');
}
</script>
