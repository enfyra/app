<script setup lang="ts">
import type { MenuDefinition } from '~/utils/types/menu';

const props = defineProps<{
  modelValue: boolean;
  menu: MenuDefinition | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'save': [];
}>();

const toast = useToast();
const tableName = "extension_definition";
const { validate, getIncludeFields, generateEmptyForm } = useSchema(tableName);
const { getId, getIdFieldName } = useDatabase();
const { me } = useEnfyraAuth();

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});
const hasFormChanges = ref(false);
const formEditorRef = ref();
const loading = ref(false);
const showUploadModal = ref(false);
const uploadLoading = ref(false);
const showPreviewModal = ref(false);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const {
  data: extensionData,
  pending: extensionLoading,
  execute: fetchExtension,
} = useApi(() => `/${tableName}`, {
  query: computed(() => {
    if (props.menu?.extension) {
      const extensionId = getId(props.menu.extension);
      if (extensionId) {
        return {
          fields: getIncludeFields(),
          filter: { id: { _eq: extensionId } },
        };
      }
    }
    return {
      fields: getIncludeFields(),
    };
  }),
  errorContext: "Fetch Extension",
  immediate: false,
});

const {
  execute: createExtension,
  pending: createLoading,
  error: createError,
} = useApi(() => `/${tableName}`, {
  method: "post",
  errorContext: "Create Extension",
});

const {
  execute: updateExtension,
  pending: updateLoading,
  error: updateError,
} = useApi(() => `/${tableName}`, {
  method: "patch",
  errorContext: "Update Extension",
});

const excludedFields = computed(() => {
  const baseExcluded = [
    "id",
    "createdAt",
    "updatedAt",
    "isSystem",
    "compiledCode",
    "menu",
  ];

  if (!props.menu?.extension) {
    baseExcluded.push("createdBy", "updatedBy");
  }

  return baseExcluded;
});

watch(() => isOpen.value, async (open) => {
  if (open) {
    if (props.menu?.extension) {
      await fetchExtension();
      const data = extensionData.value?.data?.[0];
      if (data) {
        form.value = { ...data };
        const menuId = getId(props.menu);
        if (menuId) {
          form.value.menu = { id: menuId };
        }
        hasFormChanges.value = false;
      }
    } else {
      form.value = generateEmptyForm();
      const menuId = getId(props.menu);
      if (menuId) {
        form.value.menu = { id: menuId };
      }
      errors.value = {};
      hasFormChanges.value = false;
    }
  } else {
    form.value = {};
    errors.value = {};
    hasFormChanges.value = false;
  }
});

async function handleSave() {
  const { isValid, errors: validationErrors } = validate(form.value);

  if (!isValid) {
    errors.value = validationErrors;
    toast.add({
      title: "Validation Error",
      description: "Please fill in all required fields.",
      color: "error",
    });
    return;
  }

  const idField = getIdFieldName();
  const userId = getId(me.value);

  if (props.menu?.extension && getId(props.menu.extension)) {
    const body = {
      ...form.value,
      updatedBy: userId ? { [idField]: userId } : form.value.updatedBy,
    };

    await updateExtension({
      id: getId(props.menu.extension),
      body,
    });

    if (updateError.value) {
      return;
    }
  } else {
    const body = {
      ...form.value,
      createdBy: userId ? { [idField]: userId } : undefined,
    };

    await createExtension({ body });

    if (createError.value) {
      return;
    }
  }

  toast.add({
    title: "Success",
    color: "success",
    description: props.menu?.extension ? "Extension updated!" : "Extension created!",
  });

  hasFormChanges.value = false;
  emit('save');
  emit('update:modelValue', false);
}

function handleClose() {
  isOpen.value = false;
}

async function handleUpload(files: File | File[]) {
  const fileArray = Array.isArray(files) ? files : [files];
  if (fileArray.length === 0) return;

  uploadLoading.value = true;
  const file = fileArray[0];

  try {
    const content = await file?.text();
    form.value.code = content;
    showUploadModal.value = false;

    toast.add({
      title: "Success",
      description: "Extension code uploaded successfully",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Upload Error",
      description: "Failed to read file content",
      color: "error",
    });
  } finally {
    uploadLoading.value = false;
  }
}

const isLoading = computed(() => extensionLoading.value || loading.value);
</script>

<template>
  <CommonDrawer 
    v-model="isOpen"
    direction="right"
    :class="'w-full max-w-full'"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="lucide:puzzle" class="w-5 h-5" />
        <span>{{ menu?.extension ? `Edit Extension: ${menu.extension.name || getId(menu.extension) || ''}` : `Create Extension for: ${menu?.label || ''}` }}</span>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <div v-if="isLoading" class="flex items-center justify-center py-8">
          <div class="text-gray-400">Loading extension data...</div>
        </div>
        
        <div v-else>
          <FormEditorLazy
            ref="formEditorRef"
            v-model="form"
            v-model:errors="errors"
            @has-changed="(hasChanged) => hasFormChanges = hasChanged"
            :table-name="tableName"
            :excluded="excludedFields"
            :field-map="{
              code: { type: 'code', language: 'vue', height: '400px' },
            }"
            :loading="isLoading"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2">
          <UButton
            variant="outline"
            color="primary"
            icon="lucide:eye"
            :disabled="!form?.code"
            @click="showPreviewModal = true"
          >
            Preview
          </UButton>
          <UButton
            variant="outline"
            color="secondary"
            icon="lucide:upload"
            @click="showUploadModal = true"
          >
            Upload
          </UButton>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            variant="outline"
            color="neutral"
            @click="handleClose"
          >
            Cancel
          </UButton>
          <UButton
            variant="solid"
            color="primary"
            :loading="updateLoading || createLoading"
            :disabled="!hasFormChanges"
            @click="handleSave"
          >
            {{ menu?.extension ? 'Update' : 'Create' }}
          </UButton>
        </div>
      </div>
    </template>
  </CommonDrawer>

  <CommonUploadModalLazy
    v-model="showUploadModal"
    title="Upload Extension"
    accept=".vue"
    :multiple="false"
    :max-size="5 * 1024 * 1024"
    drag-text="Drag and drop your .vue extension file here"
    accept-text="Only .vue files are accepted"
    upload-text="Upload Extension"
    uploading-text="Uploading..."
    :loading="uploadLoading"
    @upload="handleUpload"
    @error="
      (message) =>
        toast.add({
          title: 'Upload Error',
          description: message,
          color: 'error',
        })
    "
  />

  <ExtensionPreviewModal
    v-model="showPreviewModal"
    :code="form?.code || ''"
  />
</template>

