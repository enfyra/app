<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  parentId?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  created: [];
}>();

const toast = useToast();
const newFolder = ref<Record<string, any>>({});
const { generateEmptyForm, validate } = useSchema("folder_definition");
const createErrors = ref<Record<string, string>>({});

const {
  pending: createLoading,
  execute: createFolder,
  error: createError,
} = useApi(() => "/folder_definition", {
  method: "post",
  errorContext: "Create Folder",
});

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

// Initialize empty form when modal opens
watch(isOpen, (newVal) => {
  if (newVal) {
    newFolder.value = generateEmptyForm();

    // Set parent if provided
    if (props.parentId) {
      newFolder.value.parent = { id: props.parentId };
    }

    createErrors.value = {};
  }
});

async function handleCreate() {
  const { isValid, errors } = validate(newFolder.value);

  if (!isValid) {
    createErrors.value = errors;
    toast.add({
      title: "Missing information",
      color: "error",
      description: "Please fill in all required fields.",
    });
    return;
  }

  await createFolder({ body: newFolder.value });

  if (createError.value) {
    return;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "New folder created successfully!",
  });

  // Emit created event
  emit("created");

  isOpen.value = false;
}
</script>

<template>
  <Teleport to="body">
    <UModal
      v-model:open="isOpen"
      title="Create New Folder"
      :close="{
        color: 'error',
        variant: 'soft',
        size: 'lg',
        label: 'Close',
      }"
    >
      <template #header>
        <div class="flex justify-between items-center w-full">
          <div class="text-base font-semibold">Create New Folder</div>
          <UButton
            icon="lucide:x"
            color="error"
            variant="soft"
            @click="isOpen = false"
          >
            Close
          </UButton>
        </div>
      </template>

      <template #body>
        <UForm :state="newFolder" @submit="handleCreate">
          <FormEditorLazy
            :model-value="newFolder"
            @update:model-value="(value) => (newFolder = value)"
            :errors="createErrors"
            @update:errors="(errors) => (createErrors = errors)"
            table-name="folder_definition"
            :excluded="['children', 'files']"
          />
        </UForm>
      </template>

      <template #footer>
        <div class="flex justify-end w-full">
          <UButton
            variant="solid"
            color="primary"
            @click="handleCreate"
            :loading="createLoading"
            icon="lucide:save"
          >
            Create Folder
          </UButton>
        </div>
      </template>
    </UModal>
  </Teleport>
</template>
