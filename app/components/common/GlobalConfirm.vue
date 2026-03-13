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
    v-model="isVisible"
    :handle="false"
  >
      <template #title>
        <div class="flex items-center justify-between w-full">
          <div class="text-lg font-semibold">{{ options.title }}</div>
        </div>
      </template>
      <template #body>
        <div class="space-y-4 min-w-0">
          <p class="text-sm text-gray-700 dark:text-gray-300 text-center break-words min-w-0" :title="options.content">
            {{ options.content }}
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" @click="onCancel">
            {{ options.cancelText }}
          </UButton>
          <UButton :color="isDestructive ? 'error' : 'primary'" @click="onConfirm">
            {{ options.confirmText }}
          </UButton>
        </div>
      </template>
    </CommonModal>
</template>
