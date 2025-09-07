<template>
  <div>
    <Suspense>
      <FilterDrawer
        :model-value="props.modelValue"
        :table-name="props.tableName"
        :current-filter="props.currentFilter"
        @update:model-value="(value) => emit('update:modelValue', value)"
        @apply="(filter) => emit('apply', filter)"
      />
      <template #fallback>
        <div class="flex items-center justify-center p-8">
          <div class="flex items-center gap-3">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <span class="text-sm text-gray-600">Loading filter...</span>
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
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  apply: [filter: FilterGroup];
}>()
</script>