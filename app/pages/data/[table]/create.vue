<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
import { buildSharedHelperFieldMap } from '~/utils/form/shared-helper';
import {
  applyMethodColorSuggestion,
  buildMethodDefinitionFieldMap,
  normalizeMethodDefinitionRecord,
} from '~/utils/form/method-definition';

const route = useRoute();
const notify = useNotify();
const newRecord = ref<Record<string, any>>({});
const hasFormChanges = ref(false);
const { allowNextNavigation } = useUnsavedChangesGuard(() => hasFormChanges.value);
const tableName = route.params.table as string;
const { ensureSchema, generateEmptyForm } = useSchema(tableName);
const { validateForm } = useFormValidation(tableName);
const createErrors = ref<Record<string, string>>({});
const { getId } = useDatabase();
const fieldMap = computed(() =>
  tableName === 'enfyra_method' ? buildMethodDefinitionFieldMap()
    : tableName === 'enfyra_helper' ? buildSharedHelperFieldMap() : {},
);

const { getRouteForTableName, ensureRoutesLoaded } = useRoutes();


onMounted(async () => {
  await Promise.all([ensureRoutesLoaded(), ensureSchema()]);
  const initialRecord = generateEmptyForm();
  if (tableName === 'enfyra_method') {
    applyMethodColorSuggestion(initialRecord);
  }
  newRecord.value = initialRecord;
  hasFormChanges.value = false;
});

watch(() => newRecord.value?.name, () => {
  if (tableName !== 'enfyra_method') return;
  applyMethodColorSuggestion(newRecord.value);
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

registerHeaderActions([
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
          methods: ["POST"],
        },
      ],
    },
  },
]);

async function handleCreate() {
  if (tableName === 'enfyra_method') {
    normalizeMethodDefinitionRecord(newRecord.value);
  }
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
  hasFormChanges.value = false;
  allowNextNavigation();

  await navigateTo(
    `/data/${route.params.table}/${createdId}`,
    { replace: true }
  );
}
</script>

<template>
  <div class="space-y-6">
    
    <div class="eapp-page-constrained">
      <CommonPanel :sections="[{ value: 'record' }]">
        <template #record-header>
          <CommonFormHeader :title="`Create New ${route.params.table} Record`" />
        </template>
        <template #record>
      <CommonFormCard>
        <UForm :state="newRecord" @submit="handleCreate">
          <FormEditorLazy
            :table-name="(route.params.table as string)"
            mode="create"
            v-model="newRecord"
            v-model:errors="createErrors"
            :field-map="fieldMap"
            @has-changed="(hasChanged) => (hasFormChanges = hasChanged)"
          />
        </UForm>
      </CommonFormCard>
        </template>
      </CommonPanel>
    </div>
  </div>
</template>
