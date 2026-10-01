<script setup lang="ts">

const props = defineProps<{
  modelValue: boolean;
  relationMeta: any;
  selected: any[];
}>();
const emit = defineEmits(["update:modelValue", "created", "update:selected"]);

const show = computed({
  get: () => props.modelValue,
  set: (val) => {
    if (val) {
      emit("update:modelValue", val);
      return;
    }

    handleClose();
  },
});

const { getId } = useDatabase();

const targetTableName = computed(() => props.relationMeta?.targetTableName || "");
const targetTableNameResolved = computed(() => targetTableName.value || '');
const { ensureSchema, generateEmptyForm, validate } = useSchema(targetTableNameResolved);

const targetRoute = computed(() => `/${targetTableName.value}`);

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
const hasFormChanges = ref(false);
const showDiscardModal = ref(false);

watch(show, async (val) => {
  if (val) {
    await ensureSchema();
    createForm.value = generateEmptyForm({
      excluded: [props.relationMeta.inversePropertyName],
    });
    hasFormChanges.value = false;
  } else {
    showDiscardModal.value = false;
    hasFormChanges.value = false;
  }
});

async function createNewRecord() {
  if (!targetTableName.value) return;
  const { isValid, errors } = validate(createForm.value);
  if (!isValid) {
    createErrors.value = errors;
    return;
  }

  const response = await createRecord({ body: createForm.value });
  const createdRecord = extractCreatedRecord(response ?? createData.value);
  const createdId = getId(createdRecord);
  if (createdId == null || String(createdId) === "") return;
  emit("update:selected", [...props.selected, createdId]);
  emit("created");
  emit("update:modelValue", false);
}

function handleClose() {
  if (hasFormChanges.value) {
    showDiscardModal.value = true;
    return;
  }

  emit("update:modelValue", false);
}

function confirmDiscard() {
  showDiscardModal.value = false;
  hasFormChanges.value = false;
  emit("update:modelValue", false);
}
</script>

<template>
  <CommonDrawer
    :handle="false"
    v-model="show"
    direction="right"
    nested
    :cancel-action="{ label: 'Cancel', onClick: handleClose }"
    :primary-action="{
      label: 'Create Record',
      icon: 'lucide:plus',
      loading: creating,
      disabled: creating,
      onClick: createNewRecord,
    }"
  >
    <template #header>
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <div class="accent-tile accent-tile-primary flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)]">
          <UIcon name="lucide:plus" class="size-5 text-current" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="text-base font-semibold text-default sm:text-xl">
            Create New Record
          </h2>
          <p class="mt-1 truncate text-sm text-muted">
            {{ targetTableName }} table
          </p>
        </div>
      </div>
    </template>
    <template #body>
      <FormEditorLazy
        v-model="createForm"
        mode="create"
        :table-name="targetTableNameResolved"
        :errors="createErrors"
        @has-changed="(changed) => (hasFormChanges = changed)"
      />
    </template>
  </CommonDrawer>

  <CommonUnsavedChangesModal
    v-model="showDiscardModal"
    content="You have unsaved changes. Are you sure you want to close? All changes will be lost."
    @discard="confirmDiscard"
  />
</template>
