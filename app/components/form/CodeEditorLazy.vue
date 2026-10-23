<template>
  <Suspense>
    <CodeEditor
      v-if="shouldRender"
      v-bind="{
        ...(props.modelValue === undefined ? {} : { modelValue: props.modelValue }),
        ...(props.language === undefined ? {} : { language: props.language }),
        ...(props.height === undefined ? {} : { height: props.height }),
        ...(props.class === undefined ? {} : { class: props.class }),
        ...(props.error === undefined ? {} : { error: props.error }),
        ...(props.enfyraAutocomplete === undefined ? {} : { enfyraAutocomplete: props.enfyraAutocomplete }),
        ...(props.testRun === undefined ? {} : { testRun: props.testRun }),
      }"
      :readonly="props.readonly"
      @update:model-value="(value) => $emit('update:modelValue', value)"
      @diagnostics="(diags) => $emit('diagnostics', diags)"
    />
    <template #fallback>
      <div class="flex items-center justify-center p-8 bg-[var(--surface-muted)] rounded-lg border-2 border-dashed border-[var(--border-default)]">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"></div>
          <p class="text-sm text-[var(--text-tertiary)]">Loading code editor...</p>
        </div>
      </div>
    </template>
  </Suspense>
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
});

const props = defineProps<{
  modelValue?: string;
  language?: "javascript" | "typescript" | "vue" | "json" | "html";
  height?: string;
  class?: string;
  error?: string;
  enfyraAutocomplete?: boolean | 'vue';
  testRun?: boolean | Record<string, any>;
  readonly?: boolean;
}>();

defineEmits<{
  'update:modelValue': [value: string];
  'diagnostics': [diags: any[]];
}>();

const shouldRender = ref(true);

const CodeEditor = defineAsyncComponent(() => 
  import('./CodeEditor.vue')
);
</script>
