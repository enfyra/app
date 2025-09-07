<template>
  <Suspense>
    <CodeEditor 
      v-bind="$attrs" 
      @update:model-value="(value) => $emit('update:modelValue', value)"
      @diagnostics="(diags) => $emit('diagnostics', diags)"
    />
    <template #fallback>
      <div class="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"></div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Loading code editor...</p>
        </div>
      </div>
    </template>
  </Suspense>
</template>

<script setup lang="ts">
defineEmits<{
  'update:modelValue': [value: string];
  'diagnostics': [diags: any[]];
}>();

const CodeEditor = defineAsyncComponent(() => 
  import('./CodeEditor.vue')
);
</script>