<template>
  <CommonDrawer
    v-model="localOpen"
    :handle="false"
    direction="right"
    :cancel-action="{ label: 'Cancel', onClick: handleCancel }"
    :primary-action="{
      label: 'Create Sub-guard',
      loading,
      disabled: loading || !hasChanged,
      onClick: () => emit('save'),
    }"
  >
    <template #header>
      <h2 class="text-xl font-semibold">Create Sub-guard</h2>
    </template>
    <template #body>
      <div class="space-y-6">
        <div class="p-3 rounded-lg bg-[var(--surface-muted)]">
          <p class="text-xs text-[var(--text-tertiary)]">
            Sub-guards inherit the root guard's position
            (<span class="font-medium text-[var(--text-primary)]">{{ parentGuard?.position === 'pre_auth' ? 'Pre-Auth' : 'Post-Auth' }}</span>).
            They allow nesting AND/OR logic within the guard tree.
          </p>
        </div>
        <CommonFormCard :bordered="false">
          <UForm :state="form" @submit="$emit('save')">
            <FormEditorLazy
              v-model="form"
              v-model:errors="localErrors"
              :table-name="'enfyra_guard'"
              :excluded="['createdAt', 'updatedAt', 'children', 'rules', 'parent', 'route', 'isGlobal', 'isSystem', 'position', 'methods']"
              :field-map="fieldMap"
              mode="create"
              @has-changed="(v) => (hasChanged = v)"
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
  parentGuard?: Record<string, any> | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:form': [value: Record<string, any>];
  'update:errors': [value: Record<string, string>];
  save: [];
  cancel: [];
}>();

const hasChanged = ref(false);
const showDiscardModal = ref(false);

const fieldMap = {
  combinator: { component: resolveComponent('GuardCombinatorPicker') },
};

const localOpen = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (!value && hasChanged.value) {
      showDiscardModal.value = true;
    } else {
      emit('update:modelValue', value);
    }
  },
});

const form = computed({
  get: () => props.form,
  set: (value) => emit('update:form', value),
});

const localErrors = computed({
  get: () => props.errors,
  set: (value) => emit('update:errors', value),
});

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
  emit('update:modelValue', false);
  emit('cancel');
}
</script>
