<script setup lang="ts">
const props = defineProps<{
  count: number;
  onDelete: () => unknown;
}>();

const pending = ref(false);

async function deleteSelected() {
  if (pending.value || props.count < 1) return;
  pending.value = true;
  try {
    await props.onDelete();
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div class="flex shrink-0 items-center gap-2" role="group" aria-label="Selected row actions">
    <UButton
      icon="lucide:trash-2"
      color="error"
      variant="outline"
      size="sm"
      square
      aria-label="Delete selected records"
      :loading="pending"
      :disabled="pending || count < 1"
      @click="deleteSelected"
    />
  </div>
</template>
