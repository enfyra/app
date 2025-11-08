<script setup lang="ts">
const { isVisible, options, onCancel, onConfirm } = useConfirm();
watch(
  () => isVisible.value,
  (newVal) => {
    if (!newVal) onCancel();
  }
);
</script>

<template>
  <Teleport to="body">
    <UModal 
      v-model:open="isVisible" 
      :handle="false"
      :close="{
        color: 'error',
        variant: 'solid',
        size: 'lg',
      }"
    >
      <template #title>
        <div class="flex items-center justify-between w-full">
          <div class="text-lg font-semibold">{{ options.title }}</div>
        </div>
      </template>
      <template #body>
        <div class="space-y-4 min-w-0">
          <p class="text-sm text-gray-300 text-center break-words min-w-0" :title="options.content">
            {{ options.content }}
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" color="error" @click="onCancel">
            {{ options.cancelText }}
          </UButton>
          <UButton @click="onConfirm">
            {{ options.confirmText }}
          </UButton>
        </div>
      </template>
    </UModal>
  </Teleport>
</template>
