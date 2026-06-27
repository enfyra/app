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
    :cancel-action="{ label: options.cancelText, onClick: onCancel }"
    :primary-action="!isDestructive ? { label: options.confirmText, onClick: onConfirm } : false"
    :danger-action="isDestructive ? { label: options.confirmText, tone: 'danger', onClick: onConfirm } : false"
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
