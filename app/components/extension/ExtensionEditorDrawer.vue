<script setup lang="ts">
import type { MenuDefinition } from '~/types';

const props = defineProps<{
  modelValue: boolean;
  menu: MenuDefinition | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'save': [];
}>();

const notify = useNotify();
const tableName = "enfyra_extension";
const { validate, generateEmptyForm } = useSchema(tableName);
const { getId, getIdFieldName } = useDatabase();
const { me } = useAuth();
const { invalidateExtensionCache } = useDynamicComponent();

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});
const hasFormChanges = ref(false);
const showDiscardModal = ref(false);
const initialSnapshot = ref<string | null>(null);
const formEditorRef = ref();
const loading = ref(false);
const showUploadModal = ref(false);
const uploadLoading = ref(false);
const showPreviewModal = ref(false);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (value) {
      emit('update:modelValue', value);
      return;
    }

    handleClose();
  },
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
          fields: EXTENSION_EDITOR_FIELDS,
          filter: { [getIdFieldName()]: { _eq: extensionId } },
        };
      }
    }
    return {
      fields: EXTENSION_EDITOR_FIELDS,
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
    "type",
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
        form.value = { ...data, type: 'page' };
        const menuId = getId(props.menu);
        if (menuId) {
          form.value.menu = { [getIdFieldName()]: menuId };
        }
        await nextTick();
        initialSnapshot.value = stableStringify(form.value);
        hasFormChanges.value = false;
      }
    } else {
      form.value = generateEmptyForm();
      form.value.type = 'page';
      const menuId = getId(props.menu);
      if (menuId) {
        form.value.menu = { [getIdFieldName()]: menuId };
      }
      errors.value = {};
      await nextTick();
      initialSnapshot.value = stableStringify(form.value);
      hasFormChanges.value = false;
    }
  } else {
    form.value = {};
    errors.value = {};
    initialSnapshot.value = null;
    showDiscardModal.value = false;
    hasFormChanges.value = false;
  }
});

async function handleSave() {
  const { isValid, errors: validationErrors } = validate(form.value);

  if (!isValid) {
    errors.value = validationErrors;
    notify.error("Validation Error", "Please fill in all required fields.");
    return;
  }

  const uniqueOk = await formEditorRef.value?.validateAllUniqueFields?.();
  if (uniqueOk === false) {
    notify.error("Duplicate value", "Please verify all unique fields before saving.");
    return;
  }

  const idField = getIdFieldName();
  const userId = getId(me.value);
  const extensionId = props.menu?.extension ? getId(props.menu.extension) : null;
  const isUpdate = Boolean(extensionId);

  if (isUpdate) {
    const body = {
      ...form.value,
      updatedBy: userId ? { [idField]: userId } : form.value.updatedBy,
    };

    await updateExtension({
      id: extensionId,
      body,
    });

    if (updateError.value) {
      return;
    }

    invalidateExtensionCache({
      reason: "updated",
      id: extensionId,
      extensionId: form.value.extensionId,
      path: props.menu?.path ?? null,
      updatedAt: form.value.updatedAt,
    });
  } else {
    const body = {
      ...form.value,
      createdBy: userId ? { [idField]: userId } : undefined,
    };

    await createExtension({ body });

    if (createError.value) {
      return;
    }

    invalidateExtensionCache({
      reason: "created",
      id: getId(props.menu?.extension),
      extensionId: form.value.extensionId,
      path: props.menu?.path ?? null,
    });
  }

  hasFormChanges.value = false;
  emit('save');
  emit('update:modelValue', false);
}

function handleClose() {
  const hasUnsavedChanges = hasFormChanges.value
    || (props.modelValue && initialSnapshot.value !== null && stableStringify(form.value) !== initialSnapshot.value);

  if (hasUnsavedChanges) {
    showDiscardModal.value = true;
    return;
  }

  emit('update:modelValue', false);
}

function confirmDiscard() {
  showDiscardModal.value = false;
  hasFormChanges.value = false;
  emit('update:modelValue', false);
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

    notify.success("Success", "Extension code uploaded successfully");
  } catch (error) {
    notify.error("Upload Error", "Failed to read file content");
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
    :full-width="true"
    :leading-actions="[
      { label: 'Preview', icon: 'lucide:eye', tone: 'primary', disabled: !form?.code, onClick: () => (showPreviewModal = true) },
      { label: 'Upload', icon: 'lucide:upload', tone: 'secondary', onClick: () => (showUploadModal = true) },
    ]"
    :cancel-action="{ label: 'Cancel', onClick: handleClose }"
    :primary-action="{
      label: menu?.extension ? 'Update' : 'Create',
      loading: updateLoading || createLoading,
      disabled: !hasFormChanges || updateLoading || createLoading,
      onClick: handleSave,
    }"
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
          <div class="eapp-text-quaternary">Loading extension data...</div>
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
    @error="(message) => notify.error('Upload Error', message)"
  />

  <ExtensionPreviewModal
    v-model="showPreviewModal"
    :code="form?.code || ''"
  />

  <CommonModal
    v-model:open="showDiscardModal"
    :cancel-action="{ label: 'Keep editing', tone: 'primary', onClick: () => (showDiscardModal = false) }"
    :danger-action="{ label: 'Discard Changes', onClick: confirmDiscard }"
  >
    <template #header>Discard Changes</template>
    <template #body>
      <div class="text-sm text-[var(--text-secondary)]">
        You have unsaved changes. Are you sure you want to close? All changes will be lost.
      </div>
    </template>
  </CommonModal>
</template>
