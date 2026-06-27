<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false });
const value = defineModel<string>({ default: "" });

defineProps<{
  title: string;
  label: string;
  placeholder: string;
  confirmLabel: string;
}>();

const emit = defineEmits<{
  confirm: [];
}>();
</script>

<template>
  <CommonModal
    v-model:open="open"
    :cancel-action="{ label: 'Cancel', onClick: () => (open = false) }"
    :primary-action="{ label: confirmLabel, onClick: () => emit('confirm') }"
  >
    <template #header>{{ title }}</template>
    <template #body>
      <div class="space-y-4">
        <label class="block text-sm font-medium text-[var(--text-secondary)]">{{ label }}</label>
        <input
          v-model="value"
          type="text"
          :placeholder="placeholder"
          autofocus
          class="w-full px-3 py-2 border border-[var(--border-strong)] rounded-md bg-[var(--surface-default)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
          @keydown.enter="emit('confirm')"
        />
      </div>
    </template>
  </CommonModal>
</template>
