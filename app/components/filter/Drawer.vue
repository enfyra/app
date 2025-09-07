<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  tableName: string;
  currentFilter?: FilterGroup; // Optional current filter from parent
}>();

const { schemas } = useSchema();
const { addToHistory } = useFilterHistory(props.tableName);
const { hasActiveFilters } = useFilterQuery();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  apply: [filter: FilterGroup];
}>();

// Create and manage filter state internally
const { createEmptyFilter } = useFilterQuery();
const localFilter = ref<FilterGroup>(createEmptyFilter());
const originalFilter = ref<FilterGroup>(createEmptyFilter()); // Track original state

// Initialize filter from parent if provided
watch(
  () => props.currentFilter,
  (newFilter) => {
    if (newFilter) {
      localFilter.value = JSON.parse(JSON.stringify(newFilter));
    }
  },
  { immediate: true }
);

// Save original state when drawer opens and restore on cancel
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      // Use parent's current filter if provided, otherwise use existing local state
      const initialFilter = props.currentFilter || localFilter.value;
      localFilter.value = JSON.parse(JSON.stringify(initialFilter));
      originalFilter.value = JSON.parse(JSON.stringify(initialFilter));
    }
  }
);

function handleApply() {
  // Auto-save to filter history if there are active filters
  if (hasActiveFilters(localFilter.value)) {
    addToHistory(localFilter.value);
  }

  // Emit the normalized filter object
  emit("apply", { ...localFilter.value });
  emit("update:modelValue", false);
}

function handleClear() {
  // Clear local filter
  localFilter.value = createEmptyFilter();

  // Apply cleared filter immediately
  emit("apply", { ...localFilter.value });
  emit("update:modelValue", false);
}

function handleClose() {
  // Revert to original state when canceling
  localFilter.value = JSON.parse(JSON.stringify(originalFilter.value));
  emit("update:modelValue", false);
}

function applySavedFilter(filter: any) {
  // Apply saved filter directly
  localFilter.value = { ...filter };

  // Emit the filter and close
  emit("apply", { ...filter });
  emit("update:modelValue", false);
}

const hasActiveConditions = computed(() => {
  return localFilter.value.conditions.some(
    (condition: FilterCondition | FilterGroup) => {
      if ("field" in condition) {
        return condition.field && condition.operator;
      } else {
        return hasActiveFiltersLocal(condition);
      }
    }
  );
});

function hasActiveFiltersLocal(group: FilterGroup): boolean {
  return group.conditions.some((condition: FilterCondition | FilterGroup) => {
    if ("field" in condition) {
      return condition.field && condition.operator;
    } else {
      return hasActiveFiltersLocal(condition);
    }
  });
}

const { isTablet } = useScreen();
</script>

<template>
  <Teleport to="body">
    <UDrawer
      :open="modelValue"
      @update:open="(value) => (value ? null : handleClose())"
      direction="right"
      :class="isTablet ? 'w-full' : 'min-w-2xl'"
    >
      <template #header>
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-filter" class="w-8 h-8 mt-1" />
            <div>
              <h3 class="text-lg font-semibold">Filter {{ tableName }}</h3>
              <p class="text-sm text-gray-500 mt-1">
                {{
                  hasActiveConditions
                    ? `${localFilter.conditions.length} condition(s) configured`
                    : "No filters applied"
                }}
              </p>
            </div>
          </div>

          <UButton
            icon="i-lucide-x"
            size="md"
            color="error"
            variant="soft"
            @click="handleClose"
          >
            Close
          </UButton>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <div class="text-sm text-gray-600">
            Build your filter conditions below. Use AND/OR operators to combine
            multiple criteria.
          </div>

          <FilterBuilder
            v-model="localFilter"
            :schemas="schemas"
            :table-name="tableName"
          />

          <!-- Saved Filters Section -->
          <FilterSavedFilters
            :table-name="tableName"
            :current-filter="localFilter"
            @apply-filter="applySavedFilter"
            @clear-filters="handleClear"
          />
        </div>
      </template>

      <template #footer>
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-500">
            {{
              hasActiveConditions
                ? "Ready to apply filters"
                : "Add conditions above to filter results"
            }}
          </div>

          <div class="flex items-center gap-3">
            <UButton
              variant="soft"
              @click="handleClear"
              :disabled="!hasActiveConditions"
              icon="i-lucide-x"
              color="neutral"
            >
              Clear All
            </UButton>

            <UButton
              @click="handleClose"
              variant="outline"
              icon="i-lucide-x-circle"
              color="error"
            >
              Cancel
            </UButton>

            <UButton
              @click="handleApply"
              :disabled="!hasActiveConditions"
              class="min-w-[100px]"
              icon="i-lucide-check"
              color="primary"
            >
              Apply Filters
            </UButton>
          </div>
        </div>
      </template>
    </UDrawer>
  </Teleport>
</template>
