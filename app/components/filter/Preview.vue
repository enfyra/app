<script setup lang="ts">
const props = defineProps<{
  filter: FilterGroup;
  tableName: string;
  schemas: Record<string, any>;
}>();

const { buildQuery } = useFilterQuery();

const filterQuery = computed(() => {
  try {
    return buildQuery(props.filter);
  } catch {
    return null;
  }
});

const conditionCount = computed(() => {
  return countConditions(props.filter);
});

function countConditions(group: FilterGroup): number {
  let count = 0;
  for (const condition of group.conditions) {
    if ('field' in condition) {
      count++;
    } else {
      count += countConditions(condition);
    }
  }
  return count;
}

const groupCount = computed(() => {
  return countGroups(props.filter);
});

function countGroups(group: FilterGroup): number {
  let count = 0;
  for (const condition of group.conditions) {
    if (!('field' in condition)) {
      count++;
      count += countGroups(condition);
    }
  }
  return count;
}

const formattedQuery = computed(() => {
  if (!filterQuery.value) return '';
  try {
    return JSON.stringify(filterQuery.value, null, 2);
  } catch {
    return '';
  }
});

const showPreview = ref(false);

function copyToClipboard() {
  if (formattedQuery.value) {
    navigator.clipboard.writeText(formattedQuery.value);
  }
}

const { isMobile, isTablet } = useScreen();
</script>

<template>
  <div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <UIcon name="lucide:code-2" class="w-4 h-4 text-muted-foreground" />
        <span class="text-sm font-medium text-gray-800 dark:text-white/90">Filter Preview</span>
      </div>
      <UButton
        :icon="showPreview ? 'lucide:chevron-up' : 'lucide:chevron-down'"
        size="xs"
        variant="ghost"
        color="neutral"
        @click="showPreview = !showPreview"
      >
        {{ showPreview ? 'Hide' : 'Show' }}
      </UButton>
    </div>

    <div class="flex items-center gap-3 mb-3">
      <UBadge variant="soft" color="info" size="sm">
        {{ conditionCount }} condition{{ conditionCount !== 1 ? 's' : '' }}
      </UBadge>
      <UBadge v-if="groupCount > 0" variant="soft" color="secondary" size="sm">
        {{ groupCount }} group{{ groupCount !== 1 ? 's' : '' }}
      </UBadge>
      <UBadge
        :variant="filter.operator === 'and' ? 'solid' : 'outline'"
        :color="filter.operator === 'and' ? 'success' : 'warning'"
        size="sm"
      >
        {{ filter.operator.toUpperCase() }}
      </UBadge>
    </div>

    <Transition name="slide-down">
      <div
        v-if="showPreview"
        class="relative"
      >
        <div
          class="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-x-auto"
        >
          <pre
            v-if="formattedQuery"
            class="text-xs text-green-400 font-mono whitespace-pre-wrap break-all"
          >{{ formattedQuery }}</pre>
          <div v-else class="text-xs text-gray-500">
            No filter query generated
          </div>
        </div>

        <UButton
          v-if="formattedQuery"
          icon="lucide:copy"
          size="xs"
          variant="ghost"
          color="neutral"
          class="absolute top-2 right-2"
          @click="copyToClipboard"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>