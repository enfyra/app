<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    content: string;
    title?: string;
    cancelLabel?: string;
    discardLabel?: string;
  }>(),
  {
    title: 'Unsaved Changes',
    cancelLabel: 'Cancel',
    discardLabel: 'Discard Changes',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  discard: [];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

function keepEditing() {
  emit('update:modelValue', false);
}

function discardChanges() {
  emit('discard');
  emit('update:modelValue', false);
}
</script>

<template>
  <CommonModal
    v-model:open="isOpen"
    :handle="false"
    :ui="{
      overlay: 'z-[150]',
      content: 'z-[150]',
    }"
    :cancel-action="{ label: cancelLabel, onClick: keepEditing }"
    :primary-action="{ label: discardLabel, onClick: discardChanges }"
  >
    <template #header>
      <div class="flex w-full items-center justify-between">
        <div class="text-lg font-semibold">{{ title }}</div>
      </div>
    </template>
    <template #body>
      <div class="min-w-0 space-y-4">
        <p class="min-w-0 break-words text-center text-sm text-[var(--text-secondary)]">
          {{ content }}
        </p>
      </div>
    </template>
  </CommonModal>
</template>
