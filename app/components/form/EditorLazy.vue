<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
});

const props = defineProps<{
  modelValue: Record<string, any>;
  errors: Record<string, string>;
  tableName: string;
  excluded?: string[];
  includes?: string[];
  typeMap?: Record<string, any>;
  loading?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: Record<string, any>];
  "update:errors": [errors: Record<string, string>];
  "update:hasChanges": [hasChanges: boolean];
}>();

const formEditorRef = ref();

const FormEditor = defineAsyncComponent(() => import("./Editor.vue"));

// Expose confirm method
defineExpose({
  confirmChanges: () => {
    formEditorRef.value?.confirmChanges();
  },
});
</script>

<template>
  <Suspense>
    <FormEditor
      ref="formEditorRef"
      v-bind="props"
      @update:model-value="(value) => emit('update:modelValue', value)"
      @update:errors="(errors) => emit('update:errors', errors)"
      @update:has-changes="
        (hasChanges) => emit('update:hasChanges', hasChanges)
      "
    />
    <template #fallback>
      <CommonLoadingState
        title="Loading form editor..."
        description="Setting up form components"
        size="sm"
        type="form"
        context="page"
      />
    </template>
  </Suspense>
</template>
