<script setup lang="ts">

const props = defineProps<{
  modelValue: boolean;
  relationMeta: any;
  selected: any[];
}>();
const emit = defineEmits(["update:modelValue", "created", "update:selected"]);

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const { schemas, ensureSchema } = useSchema();
const { getId, getIdFieldName } = useDatabase();

const targetTableId = computed(() => {
  return typeof props.relationMeta.targetTable === 'object'
    ? getId(props.relationMeta.targetTable)
    : props.relationMeta.targetTable;
});

const targetTableName = computed(() => {
  for (const [name, schema] of Object.entries(schemas.value)) {
    if (String(getId(schema)) === String(targetTableId.value)) {
      return name;
    }
  }
  return null;
});

const targetTableNameResolved = computed(() => targetTableName.value || '');
const { generateEmptyForm, validate } = useSchema(targetTableNameResolved);

const { getRouteForTableId, ensureRoutesLoaded } = useRoutes();
const targetRoute = ref<string>('');

watchEffect(async () => {
  if (targetTableId.value) {
    await ensureRoutesLoaded();
    targetRoute.value = getRouteForTableId(targetTableId.value);
  }
});

watch(targetTableName, async (name) => {
  if (name && !schemas.value[name]) {
    await ensureSchema(name);
  }
}, { immediate: true });

const {
  data: createData,
  pending: creating,
  execute: createRecord,
} = useApi(() => targetRoute.value || `/${targetTableName.value}`, {
  method: "post",
  errorContext: "Create Relation Record",
});

const createForm = ref(generateEmptyForm());
const createErrors = ref({});
const { isMobile, isTablet } = useScreen();

watch(show, (val) => {
  if (val) {
    createForm.value = generateEmptyForm({
      excluded: [props.relationMeta.inversePropertyName],
    });
  }
});

async function createNewRecord() {
  if (!targetTableName.value) return;
  const { isValid, errors } = validate(createForm.value);
  if (!isValid) {
    createErrors.value = errors;
    return;
  }

  await createRecord({ body: createForm.value });
  const createdRecord = createData.value?.data[0];
  emit("update:selected", [
    ...props.selected,
    { [getIdFieldName()]: getId(createdRecord) },
  ]);
  emit("created");
  show.value = false;
}
</script>

<template>
  <CommonDrawer
    :handle="false"
    handle-only
    v-model="show"
    direction="right"
  >
    <template #header>
      <div :class="(isMobile || isTablet) ? 'flex items-center gap-2 min-w-0 flex-1' : 'flex items-center gap-3'">
        <div
          :class="(isMobile || isTablet) ? 'w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg flex-shrink-0' : 'w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg'"
        >
          <UIcon name="lucide:plus" :class="(isMobile || isTablet) ? 'text-xs text-white' : 'text-sm text-white'" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 :class="(isMobile || isTablet) ? 'text-base font-semibold text-foreground truncate' : 'text-xl font-semibold text-foreground'">
            Create New Record
          </h2>
          <p :class="(isMobile || isTablet) ? 'text-xs text-muted-foreground truncate' : 'text-sm text-muted-foreground'">
            {{ targetTableName }} table
          </p>
        </div>
      </div>
    </template>
      <template #body>
        <div :class="(isMobile || isTablet) ? 'space-y-3' : 'space-y-6'">
          
          <div :class="(isMobile || isTablet) ? 'bg-gray-800/50 rounded-lg border border-muted/30 p-3' : 'bg-gray-800/50 rounded-xl border border-muted/30 p-6'">
            <div :class="(isMobile || isTablet) ? 'flex items-center gap-1.5 mb-3' : 'flex items-center gap-2 mb-4'">
              <UIcon name="lucide:edit-3" class="text-info" :size="(isMobile || isTablet) ? '16' : '18'" />
              <h3 :class="(isMobile || isTablet) ? 'text-sm font-semibold text-foreground' : 'text-lg font-semibold text-foreground'">Form Fields</h3>
            </div>
            <FormEditorLazy
              v-model="createForm"
              :table-name="targetTableNameResolved"
              :errors="createErrors"
            />
          </div>

          <div :class="(isMobile || isTablet) ? 'bg-gray-800/50 rounded-lg border border-muted/30 p-3' : 'bg-gray-800/50 rounded-xl border border-muted/30 p-4'">
            <div class="flex items-center justify-between">
              <div v-if="!isMobile && !isTablet" class="flex items-center gap-2">
                <UIcon
                  name="lucide:info"
                  class="text-muted-foreground"
                  size="16"
                />
                <span class="text-sm text-muted-foreground"
                  >Ready to create new record?</span
                >
              </div>
              <div :class="(isMobile || isTablet) ? 'flex gap-1.5 w-full justify-end' : 'flex gap-3'">
                <UButton
                  icon="lucide:plus"
                  @click="createNewRecord"
                  :loading="creating"
                  :disabled="creating"
                  :size="(isMobile || isTablet) ? 'sm' : 'md'"
                  :class="(isMobile || isTablet) ? 'rounded-full !aspect-square' : ''"
                >
                  <span v-if="!isMobile && !isTablet">Create Record</span>
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </template>
    </CommonDrawer>
</template>
