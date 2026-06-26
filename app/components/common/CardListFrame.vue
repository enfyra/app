<script setup lang="ts">
type PaginationColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral';

const page = defineModel<number>('page', { default: 1 });

const props = withDefaults(defineProps<{
  loading: boolean;
  hasItems: boolean;
  rootClass?: string;
  loadingTitle?: string;
  loadingDescription?: string;
  loadingSize?: 'sm' | 'md' | 'lg';
  loadingType?: 'dots' | 'spinner' | 'skeleton' | 'table' | 'form' | 'card' | 'folder' | 'file-card' | 'menu';
  loadingContext?: 'page' | 'modal' | 'inline' | 'button';
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: string;
  emptySize?: 'sm' | 'md' | 'lg';
  total?: number;
  itemsPerPage?: number;
  paginationClass?: string;
  paginationAlign?: 'between' | 'center';
  paginationLoading?: boolean;
  paginationShowRange?: boolean;
  paginationColor?: PaginationColor;
  paginationActiveColor?: PaginationColor;
  paginationUi?: Record<string, string>;
  to?: (page: number) => any;
}>(), {
  rootClass: 'space-y-6',
  loadingTitle: 'Loading...',
  loadingDescription: undefined,
  loadingSize: 'sm',
  loadingType: 'card',
  loadingContext: 'page',
  emptyTitle: 'No items found',
  emptyDescription: undefined,
  emptyIcon: 'lucide:inbox',
  emptySize: 'sm',
  total: 0,
  itemsPerPage: 0,
  paginationClass: 'mt-6',
  paginationAlign: 'between',
  paginationLoading: false,
  paginationShowRange: true,
  paginationColor: 'primary',
  paginationActiveColor: 'primary',
  paginationUi: undefined,
  to: undefined,
});

const showPagination = computed(() =>
  props.hasItems
  && props.total > 0
  && props.itemsPerPage > 0
  && props.total > props.itemsPerPage
  && page.value !== undefined,
);
</script>

<template>
  <div :class="rootClass">
    <Transition name="loading-fade" mode="out-in">
      <div v-if="loading" key="loading">
        <slot name="loading">
          <CommonLoadingState
            :title="loadingTitle"
            :description="loadingDescription"
            :size="loadingSize"
            :type="loadingType"
            :context="loadingContext"
          />
        </slot>
      </div>

      <div v-else-if="hasItems" key="list">
        <slot />

        <CommonPaginationBar
          v-if="showPagination"
          v-model:page="page"
          :class="paginationClass"
          :items-per-page="itemsPerPage"
          :total="total"
          :loading="paginationLoading"
          :show-range="paginationShowRange"
          :align="paginationAlign"
          :color="paginationColor"
          :active-color="paginationActiveColor"
          :to="to"
          :ui="paginationUi"
        />
      </div>

      <div v-else key="empty">
        <slot name="empty">
          <CommonEmptyState
            :title="emptyTitle"
            :description="emptyDescription"
            :icon="emptyIcon"
            :size="emptySize"
          />
        </slot>
      </div>
    </Transition>
  </div>
</template>
