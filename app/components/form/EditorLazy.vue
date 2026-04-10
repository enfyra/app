<script setup lang="ts">
import type { FormEditorVirtualEmitPayload, FormEditorVirtualField } from '~/types/form-editor';

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
                      fieldMap?: Record<string, any>;
                      loading?: boolean;
                      mode?: 'create' | 'update';
                      layout?: 'stack' | 'grid';
                      currentRecordId?: string | number | null;
                      uniqueCheckMode?: 'api' | 'local';
                      uniqueLocalRecords?: any[];
                      uniqueLocalSelfKey?: string | number | null;
                      sortBy?: string;
                      sortOrder?: 'asc' | 'desc';
                      fieldPositions?: Record<string, number>;
                      virtualFields?: FormEditorVirtualField[];
                    }>(),
  {
    mode: 'update',
    layout: 'stack',
    currentRecordId: null,
    uniqueCheckMode: 'api',
    uniqueLocalRecords: () => [],
    uniqueLocalSelfKey: null,
    sortOrder: 'asc',
    virtualFields: () => [],
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: Record<string, any>];
  "update:errors": [errors: Record<string, string>];
  "hasChanged": [hasChanged: boolean];
  virtualFieldEmit: [payload: FormEditorVirtualEmitPayload];
}>();

const formEditorRef = ref();

const FormEditor = defineAsyncComponent(() => import("./Editor.vue"));

defineExpose({
  confirmChanges: () => {
    formEditorRef.value?.confirmChanges();
  },
  validateAllUniqueFields: () => {
    return formEditorRef.value?.validateAllUniqueFields?.();
  },
  getUniqueFieldsNeedingCheck: () => {
    return formEditorRef.value?.getUniqueFieldsNeedingCheck?.() || [];
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
      @virtual-field-emit="(p) => emit('virtualFieldEmit', p)"
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
