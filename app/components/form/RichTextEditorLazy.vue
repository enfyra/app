<template>
  <ClientOnly>
    <template #fallback>
      <div
        class="flex items-center justify-center p-8 bg-[var(--surface-muted)] rounded-lg border-2 border-dashed border-[var(--border-default)]"
      >
        <div class="text-center">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"
          ></div>
          <p class="text-sm text-[var(--text-tertiary)]">
            Loading rich text editor...
          </p>
        </div>
      </div>
    </template>
    <RichTextEditor
      :model-value="modelValue"
      :disabled="disabled"
      :height="height"
      :placeholder="placeholder"
      :editor-config="editorConfig"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </ClientOnly>
</template>

<script setup lang="ts">
import type { RichTextEditorConfig } from "~/types/rich-text-editor";

const RichTextEditor = defineAsyncComponent(
  () => import("./RichTextEditor.vue")
);

defineProps<{
  modelValue: string | null;
  disabled?: boolean;
  height?: number;
  placeholder?: string;
  editorConfig?: RichTextEditorConfig;
}>();

defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>
