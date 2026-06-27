<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  parentId?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  created: [];
}>();

const notify = useNotify();
const newFolder = ref<Record<string, any>>({});
const { generateEmptyForm, validate } = useSchema("enfyra_folder");
const createErrors = ref<Record<string, string>>({});
const hasFormChanges = ref(false);
const showDiscardModal = ref(false);

const {
  pending: createLoading,
  execute: createFolder,
  error: createError,
} = useApi(() => "/enfyra_folder", {
  method: "post",
  errorContext: "Create Folder",
});

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (value) {
      emit("update:modelValue", value);
      return;
    }

    handleClose();
  },
});

watch(isOpen, (newVal) => {
  if (newVal) {
    newFolder.value = generateEmptyForm();

    if (props.parentId) {
      const { getIdFieldName } = useDatabase();
      newFolder.value.parent = { [getIdFieldName()]: props.parentId };
    }

    createErrors.value = {};
    hasFormChanges.value = false;
  } else {
    showDiscardModal.value = false;
    hasFormChanges.value = false;
  }
});

async function handleCreate() {
  const { isValid, errors } = validate(newFolder.value);

  if (!isValid) {
    createErrors.value = errors;
    notify.error("Missing information", "Please fill in all required fields.");
    return;
  }

  await createFolder({ body: newFolder.value });

  if (createError.value) {
    return;
  }

  notify.success("Success", "New folder created successfully!");

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
  <CommonModal
    v-model:open="isOpen"
    :cancel-action="{ label: 'Cancel', onClick: handleClose }"
    :primary-action="{ label: 'Create Folder', icon: 'lucide:save', loading: createLoading, disabled: createLoading, onClick: handleCreate }"
  >
    <template #header>
      Create New Folder
    </template>

      <template #body>
        <UForm :state="newFolder" @submit="handleCreate">
          <FormEditorLazy
            :model-value="newFolder"
            @update:model-value="(value) => (newFolder = value)"
            @has-changed="(changed) => (hasFormChanges = changed)"
            :errors="createErrors"
            @update:errors="(errors) => (createErrors = errors)"
            table-name="enfyra_folder"
            :excluded="['children', 'files']"
          />
        </UForm>
      </template>

    </CommonModal>

  <CommonModal
    v-model:open="showDiscardModal"
    :cancel-action="{ label: 'Cancel', onClick: () => (showDiscardModal = false) }"
    :danger-action="{ label: 'Discard Changes', tone: 'danger', onClick: confirmDiscard }"
  >
    <template #header>Discard Changes</template>
    <template #body>
      <div class="text-sm text-[var(--text-secondary)]">
        You have unsaved changes. Are you sure you want to close? All changes will be lost.
      </div>
    </template>
  </CommonModal>
</template>
