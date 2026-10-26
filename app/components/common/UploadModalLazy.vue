<template>
  <div v-if="props.modelValue">
    <Suspense>
      <UploadModal
        v-bind="{
          modelValue: props.modelValue,
          ...(props.title === undefined ? {} : { title: props.title }),
          ...(props.accept === undefined ? {} : { accept: props.accept }),
          multiple: props.multiple,
          ...(props.maxSize === undefined ? {} : { maxSize: props.maxSize }),
          ...(props.dragText === undefined ? {} : { dragText: props.dragText }),
          ...(props.acceptText === undefined ? {} : { acceptText: props.acceptText }),
          ...(props.uploadText === undefined ? {} : { uploadText: props.uploadText }),
          ...(props.uploadingText === undefined ? {} : { uploadingText: props.uploadingText }),
          loading: props.loading,
          ...(props.uploadProgress === undefined ? {} : { uploadProgress: props.uploadProgress }),
          ...(props.fileProgress === undefined ? {} : { fileProgress: props.fileProgress }),
        }"
        @update:model-value="(value) => emit('update:modelValue', value)"
        @upload="(files) => emit('upload', files)"
        @error="(message) => emit('error', message)"
      />
      <template #fallback>
        <div class="flex items-center justify-center p-8">
          <div class="flex items-center gap-3">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <span class="text-sm text-[var(--text-tertiary)]">Loading upload modal...</span>
          </div>
        </div>
      </template>
    </Suspense>
  </div>
</template>

<script setup lang="ts">
import type { UploadModalProps, UploadModalEmits } from "~/types";

const UploadModal = defineAsyncComponent(() => import('./UploadModal.vue'))

const props = defineProps<UploadModalProps>()

const emit = defineEmits<UploadModalEmits>()
</script>
