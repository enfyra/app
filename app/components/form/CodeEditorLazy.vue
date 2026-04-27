<template>
  <Suspense>
    <CodeEditor
      v-if="shouldRender"
      :model-value="props.modelValue"
      :language="props.language"
      :height="props.height"
      :class="props.class"
      :error="props.error"
      :enfyra-autocomplete="props.enfyraAutocomplete"
      :test-run="props.testRun"
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
