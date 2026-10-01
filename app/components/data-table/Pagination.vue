<script setup lang="ts">
import type { TablePaginationProps } from '~/types/table-pagination'

const props = withDefaults(defineProps<TablePaginationProps>(), {
  mode: 'offset',
  total: 0,
  loading: false,
  showPageSize: false,
  loadedCount: 0,
  hasMore: false,
  floating: true,
})
const page = defineModel<number>('page', { default: 1 })
const emit = defineEmits<{
  'page-size-change': [size: number]
  'load-more': []
}>()
const pageSizes = [10, 20, 50, 100].map(value => ({ label: String(value), value }))
const isCursor = computed(() => props.mode === 'cursor')
const hasPagination = computed(() => props.total > props.itemsPerPage && props.itemsPerPage > 0)
const pageStart = computed(() => props.total > 0 ? (page.value - 1) * props.itemsPerPage + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * props.itemsPerPage, props.total))
const rangeLabel = computed(() => isCursor.value
  ? `${props.loadedCount} loaded`
  : props.total > 0 ? `${pageStart.value}–${pageEnd.value} / ${props.total}` : '0 results')
const paginationFooter = shallowRef<HTMLElement | null>(null)
const floatingTarget = computed(() => props.floating && !isCursor.value ? paginationFooter.value : null)
const tableScope = computed(() => props.floating && !isCursor.value ? props.scope ?? null : null)
const { isMiniVisible } = useMiniBarVisibility(floatingTarget, tableScope)
const { active: showLoading } = useDeferredBusy(() => props.loading)
const { isMobile } = useScreen()
const showMiniPagination = computed(() => props.floating && !isCursor.value && hasPagination.value && isMiniVisible.value)
const miniPaginationSize = computed(() => isMobile.value ? 'xs' : 'sm')

function setPageSize(value: string | number) {
  const size = Number(value)
  if (size === props.itemsPerPage || !pageSizes.some(item => item.value === size)) return
  emit('page-size-change', size)
}

function loadMore() {
  if (props.loading || !props.hasMore) return
  emit('load-more')
}
</script>

<template>
  <div ref="paginationFooter" class="eapp-settings-pagination grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-3 md:gap-3" :class="isCursor ? 'md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]' : 'md:flex md:flex-wrap md:justify-between'" aria-label="Table pagination" :aria-busy="loading">
    <div class="flex min-w-0 items-center gap-3 whitespace-nowrap text-xs tabular-nums text-muted">
      <slot name="summary" />
      <span v-if="$slots.summary" aria-hidden="true">·</span>
      <span>{{ rangeLabel }}</span>
    </div>
    <div class="flex items-center justify-end gap-3" :class="isCursor ? 'md:col-start-3 md:row-start-1' : 'md:ml-auto'">
      <label v-if="showPageSize" class="flex items-center gap-2 whitespace-nowrap text-xs text-muted">
        Rows per page
        <USelect :model-value="itemsPerPage" :items="pageSizes" value-key="value" size="sm" class="w-18" aria-label="Rows per page" @update:model-value="setPageSize" />
      </label>
      <UIcon v-if="showLoading && !isCursor" name="lucide:loader-circle" class="size-4 animate-spin text-muted" aria-label="Loading page" />
    </div>
    <div v-if="isCursor" class="col-span-2 flex w-full justify-center border-t border-default pt-3 md:col-span-1 md:col-start-2 md:row-start-1 md:border-t-0 md:pt-0">
      <UButton label="Load more" icon="lucide:chevron-down" color="neutral" variant="outline" size="sm" :loading="loading" :disabled="!hasMore || loading" @click="loadMore" />
    </div>
    <UPagination
      v-else-if="hasPagination"
      v-model:page="page"
      :items-per-page="itemsPerPage"
      :total="total"
      :to="to"
      :sibling-count="2"
      size="sm"
      :ui="{ root: 'eapp-table-pagination-controls col-span-2 min-w-0 w-full justify-self-end border-t border-default pt-3 md:w-auto md:col-auto md:border-t-0 md:pt-0', list: 'w-full flex-wrap justify-center md:justify-end', item: 'min-w-8' }"
    />
  </div>
  <Teleport v-if="floating && !isCursor" to="body">
    <Transition name="mini-pagination">
      <div v-show="showMiniPagination" class="eapp-pagination eapp-pagination-mini fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-md items-center gap-2 rounded-[var(--radius-panel)] px-3 py-1.5 md:max-w-lg md:gap-4 md:px-4 md:py-2.5">
        <div class="min-w-0 flex-1 overflow-x-auto">
          <UPagination v-model:page="page" :size="miniPaginationSize" :items-per-page="itemsPerPage" :total="total" :to="to" :ui="{ root: 'eapp-table-pagination-controls min-w-max w-fit', list: 'flex-nowrap gap-0.5 md:gap-1', item: 'min-w-7 md:min-w-8' }" />
        </div>
        <span class="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted md:text-sm">{{ rangeLabel }}</span>
      </div>
    </Transition>
  </Teleport>
</template>
