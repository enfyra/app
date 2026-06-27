<template>
  <CommonDrawer
    v-model="localOpen"
    :handle="false"
    direction="right"
    full-width
    :cancel-action="{ label: 'Cancel', onClick: handleCancel }"
    :primary-action="{
      label: 'Save Handler',
      loading,
      disabled: loading || !hasChanged,
      onClick: () => emit('save'),
    }"
  >
    <template #header>
      <h2 class="text-xl font-semibold">Edit Handler</h2>
    </template>
    <template #body>
      <div class="space-y-6">
        <CommonFormCard :bordered="false">
          <UForm :state="localForm" @submit="$emit('save')">
            <FormEditorLazy
              v-model="localForm"
              v-model:errors="localErrors"
              :table-name="'enfyra_route_handler'"
              :excluded="excludedFields"
              :field-map="fieldMap"
              mode="update"
            />
          </UForm>
        </CommonFormCard>
      </div>
    </template>
  </CommonDrawer>

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

<script setup lang="ts">
interface Props {
  modelValue: boolean;
  form: Record<string, any>;
  errors: Record<string, string>;
  loading: boolean;
  routeId?: string;
  routePath?: string;
  allowedMethods?: string[];
  lockMethod?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:form': [value: Record<string, any>];
  'update:errors': [value: Record<string, string>];
  save: [];
  cancel: [];
}>();

const initialSnapshot = ref<string | null>(null);
const hasChanged = ref(false);
const showDiscardModal = ref(false);

const localOpen = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (value) {
      emit('update:modelValue', value);
      return;
    }

    handleCancel();
  },
});

const localForm = computed({
  get: () => props.form,
  set: (value) => emit('update:form', value),
});

const localErrors = computed({
  get: () => props.errors,
  set: (value) => emit('update:errors', value),
});

const fieldMap = computed(() => ({
  method: {
    type: 'method-selector',
    componentProps: {
      excludeGqlMethods: true,
      ...(props.allowedMethods ? { allowedMethods: props.allowedMethods } : {}),
    },
  },
  sourceCode: getRouteHandlerSourceCodeFieldConfig({
    routeId: props.routeId,
    routePath: props.routePath,
    handlerId: localForm.value?.id ?? localForm.value?._id,
    method: localForm.value?.method,
    availableMethods: props.allowedMethods,
  }),
}));

const excludedFields = computed(() => getRouteHandlerExcludedFields(props.lockMethod));

watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    await nextTick();
    initialSnapshot.value = stableStringify(props.form);
    hasChanged.value = false;
  } else {
    initialSnapshot.value = null;
    hasChanged.value = false;
  }
}, { immediate: true });

watch(() => props.form, (newForm) => {
  if (!props.modelValue || initialSnapshot.value === null) return;
  hasChanged.value = stableStringify(newForm) !== initialSnapshot.value;
}, { deep: true });

function handleCancel() {
  if (hasChanged.value) {
    showDiscardModal.value = true;
  } else {
    emit('cancel');
  }
}

function confirmDiscard() {
  showDiscardModal.value = false;
  hasChanged.value = false;
  emit('cancel');
}
</script>
