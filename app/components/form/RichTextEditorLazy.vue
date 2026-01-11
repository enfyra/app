<template>
  <ClientOnly>
    <template #fallback>
      <div
        class="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700"
      >
        <div class="text-center">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"
          ></div>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Loading rich text editor...
          </p>
        </div>
      </div>
    </template>
    <RichTextEditor
      :model-value="modelValue"
      :disabled="disabled"
      :height="height"
      :editor-config="editorConfig"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </ClientOnly>
</template>

<script setup lang="ts">
const RichTextEditor = defineAsyncComponent(
  () => import("./RichTextEditor.vue")
);

defineProps<{
  modelValue: string | null;
  disabled?: boolean;
  height?: number;
  editorConfig?: any;
}>();

defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>
