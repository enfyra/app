<script setup lang="ts">
const props = defineProps<{
  count: number;
  onClear: () => void;
  onDelete: () => unknown;
  compact?: boolean;
}>();

const { isDesktop } = useScreen();
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
  <div :class="compact ? 'flex min-h-8 items-center gap-1' : 'flex w-full items-center justify-between gap-3 lg:w-auto'" role="group" aria-label="Selected row actions">
    <template v-if="!isDesktop">
      <div class="flex shrink-0 items-center gap-1">
        <span v-if="!compact" class="text-xs font-medium text-muted" aria-live="polite">{{ count }} selected</span>
        <UButton
          icon="lucide:x"
          label="Clear"
          aria-label="Clear selection"
          color="neutral"
          variant="outline"
          size="xs"
          :disabled="pending"
          class="relative min-h-8 pointer-coarse:before:absolute pointer-coarse:before:-inset-y-1.5 pointer-coarse:before:inset-x-0 pointer-coarse:before:content-['']"
          @click="onClear"
        />
      </div>
      <UButton
        label="Delete"
        icon="lucide:trash-2"
        color="error"
        variant="outline"
        size="xs"
        :loading="pending"
        :disabled="pending || count < 1"
        class="relative min-h-8 text-xs pointer-coarse:before:absolute pointer-coarse:before:-inset-y-1.5 pointer-coarse:before:inset-x-0 pointer-coarse:before:content-['']"
        @click="deleteSelected"
      />
    </template>
    <UButton
      v-else
      :label="`Delete Selected (${count})`"
      icon="lucide:trash-2"
      color="error"
      variant="solid"
      size="md"
      :loading="pending"
      :disabled="pending || count < 1"
      @click="deleteSelected"
    />
  </div>
</template>
