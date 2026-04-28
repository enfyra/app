<template>
  <CommonDrawer
    v-model="localOpen"
    :handle="false"
    direction="right"
    full-width
  >
    <template #header>
      <h2 class="text-xl font-semibold">Create {{ hookType === 'pre' ? 'Pre' : 'Post' }}-Hook</h2>
    </template>
    <template #body>
      <div class="space-y-6">
        <CommonFormCard :bordered="false">
          <UForm :state="localForm" @submit="$emit('save')">
            <FormEditorLazy
              v-model="localForm"
              v-model:errors="localErrors"
              :table-name="hookType === 'pre' ? 'pre_hook_definition' : 'post_hook_definition'"
              :excluded="excludedFields"
              :field-map="fieldMap"
              mode="create"
            />
          </UForm>
        </CommonFormCard>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          variant="outline"
          color="error"
          @click="handleCancel"
        >
          Cancel
        </UButton>
        <UButton
          variant="solid"
          color="primary"
          :loading="loading"
          :disabled="loading || !hasChanged"
          @click="$emit('save')"
        >
          Create Hook
        </UButton>
      </div>
    </template>
  </CommonDrawer>

  <CommonModal v-model="showDiscardModal">
    <template #title>Discard Changes</template>
    <template #body>
      <div class="text-sm text-[var(--text-secondary)]">
        You have unsaved changes. Are you sure you want to close? All changes will be lost.
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton variant="ghost" color="error" @click="showDiscardModal = false">Cancel</UButton>
        <UButton @click="confirmDiscard">Discard Changes</UButton>
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
  hookType?: 'pre' | 'post';
  routeId?: string;
  allowedMethods?: string[];
  lockMethod?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  hookType: 'pre',
});

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
  methods: {
    type: 'methods-selector',
    componentProps: {
      excludeGqlMethods: true,
      ...(props.allowedMethods ? { allowedMethods: props.allowedMethods } : {}),
    },
  },
  sourceCode: {
    description: props.hookType === 'post'
      ? 'Do not return a value. Update @DATA or $ctx.$data instead.'
      : 'Return is optional. Use @BODY, @QUERY, @PARAMS, @USER, #table_name, @HELPERS.',
  },
}));

const excludedFields = computed(() => {
  const base = ['createdAt', 'updatedAt', 'route', 'isSystem'];
  if (props.lockMethod) base.push('methods');
  return base;
});

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
