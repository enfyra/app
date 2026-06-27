<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  tableName: string;
  currentFilter?: FilterGroup; 
  nested?: boolean;
}>();

const { schemas } = useSchema();
const { addToHistory } = useFilterHistory(props.tableName);
const { createEmptyFilter, hasActiveFilters, countActiveFilters } = useFilterQuery();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  apply: [filter: FilterGroup];
}>();

const localFilter = ref<FilterGroup>(createEmptyFilter());
const originalFilter = ref<FilterGroup>(createEmptyFilter()); 
const activeFilterCount = computed(() => countActiveFilters(localFilter.value));

watch(
  () => props.currentFilter,
  (newFilter) => {
    if (newFilter) {
      localFilter.value = JSON.parse(JSON.stringify(newFilter));
    }
  },
  { immediate: true }
);

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      
      const initialFilter = props.currentFilter || localFilter.value;
      localFilter.value = JSON.parse(JSON.stringify(initialFilter));
      originalFilter.value = JSON.parse(JSON.stringify(initialFilter));
    }
  }
);

function handleApply() {
  
  if (hasActiveFilters(localFilter.value)) {
    addToHistory(localFilter.value);
  }

  emit("apply", { ...localFilter.value });
  emit("update:modelValue", false);
}

function handleClear() {
  
  localFilter.value = createEmptyFilter();

  emit("apply", { ...localFilter.value });
  emit("update:modelValue", false);
}

function handleClose() {
  
  localFilter.value = JSON.parse(JSON.stringify(originalFilter.value));
  emit("update:modelValue", false);
}

function applySavedFilter(filter: any) {
  
  localFilter.value = { ...filter };

  emit("apply", { ...filter });
  emit("update:modelValue", false);
}

const hasActiveConditions = computed(() => activeFilterCount.value > 0);

const { isMobile, isTablet } = useScreen();
</script>

<template>
  <CommonDrawer
    :handle="false"
    handle-only
    :model-value="modelValue"
    @update:model-value="(value) => (value ? null : handleClose())"
    direction="right"
    :nested="props.nested === true"
    :class="(isMobile || isTablet) ? 'w-full max-w-full' : 'min-w-2xl max-w-2xl'"
    :footer-hint="hasActiveConditions ? 'Ready to apply filters' : 'Add conditions above to filter results'"
    :leading-actions="[{
      label: 'Clear All',
      icon: 'i-lucide-x',
      tone: 'neutral',
      variant: 'soft',
      disabled: !hasActiveConditions,
      onClick: handleClear,
    }]"
    :primary-action="{
      label: 'Apply Filters',
      icon: 'i-lucide-check',
      disabled: !hasActiveConditions,
      onClick: handleApply,
    }"
  >
    <template #header>
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-start gap-2 md:gap-3 min-w-0 flex-1">
          <UIcon name="i-lucide-filter" :class="(isMobile || isTablet) ? 'w-6 h-6' : 'w-8 h-8 mt-1'" />
          <div class="min-w-0 flex-1">
            <h3 :class="(isMobile || isTablet) ? 'text-base font-semibold truncate' : 'text-lg font-semibold'">Filter {{ tableName }}</h3>
            <p class="text-xs md:text-sm text-[var(--text-tertiary)] mt-1">
              {{
                hasActiveConditions
                  ? `${activeFilterCount} condition${activeFilterCount === 1 ? "" : "s"} configured`
                  : "No filters applied"
              }}
            </p>
          </div>
        </div>
      </div>
    </template>

      <template #body>
        <div class="space-y-4">
          <div class="text-sm text-[var(--text-tertiary)]">
            Build your filter conditions below. Use AND/OR operators to combine
            multiple criteria. Drag to reorder conditions.
          </div>

          <FilterBuilder
            v-model="localFilter"
            :schemas="schemas"
            :table-name="tableName"
          />

          <FilterPreview
            v-if="hasActiveConditions"
            :filter="localFilter"
            :table-name="tableName"
            :schemas="schemas"
          />

          <FilterSavedFilters
            :table-name="tableName"
            :current-filter="localFilter"
            @apply-filter="applySavedFilter"
            @clear-filters="handleClear"
          />
        </div>
      </template>

    </CommonDrawer>
</template>
