<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    modelValue: Record<string, any>;
    errors: Record<string, string>;
    tableName: string;
    excluded?: string[];
    includes?: string[];
    typeMap?: Record<string, any>;
    loading?: boolean;
    mode?: 'create' | 'update';
  }>(),
  {
    mode: 'update',
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: Record<string, any>];
  "update:errors": [errors: Record<string, string>];
  "hasChanged": [hasChanged: boolean];
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
      @has-changed="(hasChanged) => emit('hasChanged', hasChanged)"
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
