<script setup lang="ts">
const { isVisible, options, onCancel, onConfirm } = useConfirm();

watch(
  () => isVisible.value,
  (newVal) => {
    if (!newVal) onCancel();
  }
);

const isDestructive = computed(() => {
  const text = options.value.confirmText?.toLowerCase() || '';
  return text.includes('delete') || text.includes('remove') || text.includes('destroy');
});

const cancelAction = computed(() => ({
  label: options.value.cancelText,
  tone: options.value.cancelText?.toLowerCase() === 'keep editing' ? 'primary' as const : undefined,
  onClick: onCancel,
}));

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && isVisible.value) {
    e.preventDefault();
    onConfirm();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <CommonModal
    v-model:open="isVisible"
    :handle="false"
    :ui="{
      overlay: 'z-[150]',
      content: 'z-[150]',
    }"
    :cancel-action="cancelAction"
    :primary-action="{
      label: options.confirmText,
      tone: isDestructive ? 'danger' : undefined,
      onClick: onConfirm,
    }"
  >
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div class="text-lg font-semibold">{{ options.title }}</div>
        </div>
      </template>
      <template #body>
        <div class="space-y-4 min-w-0">
          <p class="text-sm text-[var(--text-secondary)] text-center break-words min-w-0" :title="options.content">
            {{ options.content }}
          </p>
        </div>
      </template>
    </CommonModal>
</template>
