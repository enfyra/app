<template>
  <div>
    <Suspense>
      <FilterDrawer
        :key="props.historyKey || props.tableName"
        :model-value="props.modelValue"
        :table-name="props.tableName"
        v-bind="{
          ...(props.currentFilter === undefined ? {} : { currentFilter: props.currentFilter }),
          ...(props.allowedFields === undefined ? {} : { allowedFields: props.allowedFields }),
          ...(props.historyKey === undefined ? {} : { historyKey: props.historyKey }),
          ...(props.title === undefined ? {} : { title: props.title }),
        }"
        @update:model-value="(value) => emit('update:modelValue', value)"
        @apply="(filter) => emit('apply', filter)"
      />
      <template #fallback>
        <div class="flex items-center justify-center p-8">
          <div class="flex items-center gap-3">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <span class="text-sm text-[var(--text-tertiary)]">Loading filter...</span>
          </div>
        </div>
      </template>
    </Suspense>
  </div>
</template>

<script setup lang="ts">
const FilterDrawer = defineAsyncComponent(() => import('./Drawer.vue'))

const props = defineProps<{
  modelValue: boolean;
  tableName: string;
  currentFilter?: FilterGroup;
  allowedFields?: string[];
  historyKey?: string;
  title?: string;
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  apply: [filter: FilterGroup];
}>()
</script>
