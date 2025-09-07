<template>
  <div>
    <Suspense>
      <UploadModal
        :model-value="props.modelValue"
        :title="props.title"
        :accept="props.accept"
        :multiple="props.multiple"
        :max-size="props.maxSize"
        :drag-text="props.dragText"
        :accept-text="props.acceptText"
        :upload-text="props.uploadText"
        :uploading-text="props.uploadingText"
        :loading="props.loading"
        @update:model-value="(value) => emit('update:modelValue', value)"
        @upload="(files) => emit('upload', files)"
        @error="(message) => emit('error', message)"
      />
      <template #fallback>
        <div class="flex items-center justify-center p-8">
          <div class="flex items-center gap-3">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <span class="text-sm text-gray-600">Loading upload modal...</span>
          </div>
        </div>
      </template>
    </Suspense>
  </div>
</template>

<script setup lang="ts">
import type { UploadModalProps, UploadModalEmits } from "../../utils/types";

const UploadModal = defineAsyncComponent(() => import('./UploadModal.vue'))

const props = defineProps<UploadModalProps>()

const emit = defineEmits<UploadModalEmits>()
</script>