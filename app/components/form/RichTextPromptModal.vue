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
  <CommonModal v-model:open="open">
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
    <template #footer>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] rounded-md transition-colors"
          @click="open = false"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-4 py-2 bg-[var(--md-primary)] text-white rounded-md hover:bg-primary-700 transition-colors"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </template>
  </CommonModal>
</template>
