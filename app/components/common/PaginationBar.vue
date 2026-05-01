<script setup lang="ts">
type PaginationColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral';

const page = defineModel<number>('page', { required: true });

const props = withDefaults(defineProps<{
  total: number;
  itemsPerPage: number;
  loading?: boolean;
  showRange?: boolean;
  showEdges?: boolean;
  siblingCount?: number;
  align?: 'between' | 'center';
  color?: PaginationColor;
  activeColor?: PaginationColor;
  to?: (page: number) => any;
  ui?: Record<string, string>;
}>(), {
  loading: false,
  showRange: true,
  showEdges: true,
  siblingCount: 1,
  align: 'between',
  color: 'primary',
  activeColor: 'primary',
});

const pageStart = computed(() => {
  if (props.total <= 0) return 0;
  return ((page.value || 1) - 1) * props.itemsPerPage + 1;
});

const pageEnd = computed(() => Math.min((page.value || 1) * props.itemsPerPage, props.total));
const hasPagination = computed(() => props.total > props.itemsPerPage);
const rootClass = computed(() =>
  props.align === 'center'
    ? 'flex flex-col items-center justify-center gap-2 sm:flex-row'
    : 'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
);
</script>

<template>
  <div v-if="hasPagination" :class="rootClass">
    <div class="flex min-w-0 items-center gap-2">
      <UPagination
        v-model:page="page"
        :items-per-page="itemsPerPage"
        :total="total"
        :show-edges="showEdges"
        :sibling-count="siblingCount"
        :to="to"
        :disabled="loading"
        :color="color"
        :active-color="activeColor"
        :ui="ui"
      />
      <div
        v-if="loading"
        class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-default)] px-2.5 py-1 text-xs text-[var(--text-tertiary)] shadow-sm"
      >
        <UIcon name="lucide:loader-circle" class="h-3.5 w-3.5 animate-spin text-primary-500" />
        Loading
      </div>
    </div>

    <p v-if="showRange" class="text-sm text-[var(--text-tertiary)]">
      Showing <span class="text-[var(--text-secondary)]">{{ pageStart }}-{{ pageEnd }}</span>
      of <span class="text-[var(--text-secondary)]">{{ total }}</span> results
    </p>
  </div>
</template>
