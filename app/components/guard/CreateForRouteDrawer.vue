<template>
  <CommonDrawer
    v-model="localOpen"
    :handle="false"
    direction="right"
    :cancel-action="{ label: 'Cancel', onClick: handleCancel }"
    :primary-action="{
      label: 'Create Guard',
      loading,
      disabled: loading || (!hasChanged && !selectedTemplate),
      onClick: () => emit('save'),
    }"
  >
    <template #header>
      <h2 class="text-xl font-semibold">Create Guard</h2>
    </template>
    <template #body>
      <div class="space-y-6">
        <section class="space-y-3">
          <div>
            <h3 class="text-sm font-semibold text-[var(--text-primary)]">
              Quick templates
            </h3>
            <p class="text-xs text-[var(--text-tertiary)]">
              These create a route-scoped guard and its first rule.
            </p>
          </div>
          <GuardTemplateGrid
            :model-value="selectedTemplate"
            :templates="templates"
            @update:model-value="(value) => emit('update:selectedTemplate', value)"
          />
        </section>

        <CommonFormCard :bordered="false">
          <UForm :state="localForm" @submit="$emit('save')">
            <FormEditorLazy
              v-model="localForm"
              v-model:errors="localErrors"
              :table-name="'enfyra_guard'"
              :excluded="['createdAt', 'updatedAt', 'children', 'rules', 'parent', 'route', 'isGlobal', 'isSystem']"
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
    :cancel-action="{ label: 'Cancel', onClick: () => (showDiscardModal = false) }"
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
import type { GuardTemplate } from '~/types/guard-template';

interface Props {
  modelValue: boolean;
  form: Record<string, any>;
  errors: Record<string, string>;
  loading: boolean;
  selectedTemplate: string | null;
  templates: GuardTemplate[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:form': [value: Record<string, any>];
  'update:errors': [value: Record<string, string>];
  'update:selectedTemplate': [value: string | null];
  save: [];
  cancel: [];
}>();

const hasChanged = ref(false);
const showDiscardModal = ref(false);

const fieldMap = {
  position: { component: resolveComponent('GuardPositionPicker') },
  combinator: { component: resolveComponent('GuardCombinatorPicker') },
  methods: { type: 'methods-selector', componentProps: { excludeGqlMethods: true } },
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

const localForm = computed({
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
