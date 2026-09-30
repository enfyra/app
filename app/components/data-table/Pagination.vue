<script setup lang="ts">
import type { TablePaginationProps } from '~/types/table-pagination'

const props = withDefaults(defineProps<TablePaginationProps>(), {
  mode: 'offset',
  total: 0,
  loading: false,
  showPageSize: false,
  loadedCount: 0,
  hasMore: false,
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
const tableScope = computed(() => props.scope ?? null)
const { isMiniVisible } = useMiniBarVisibility(paginationFooter, tableScope)
const { active: showLoading } = useDeferredBusy(() => props.loading)
const { isMobile } = useScreen()
const showMiniPagination = computed(() => !isCursor.value && hasPagination.value && isMiniVisible.value)
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
  <div ref="paginationFooter" class="eapp-settings-pagination grid grid-cols-2 items-center gap-x-2 gap-y-3 md:gap-3" :class="isCursor ? 'md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]' : 'md:flex md:flex-wrap md:justify-between'" aria-label="Table pagination" :aria-busy="loading">
    <div class="min-w-0 text-xs tabular-nums text-muted">
      <span class="whitespace-nowrap">{{ rangeLabel }}</span>
      <slot name="summary" />
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
      :ui="{ root: 'col-span-2 justify-self-end md:w-auto md:col-auto' }"
    />
  </div>
  <Teleport v-if="!isCursor" to="body">
    <Transition name="mini-pagination">
      <div v-show="showMiniPagination" class="eapp-pagination eapp-pagination-mini fixed inset-x-3 bottom-3 z-30 mx-auto flex flex-wrap max-w-md items-center justify-between gap-3 rounded-[var(--radius-panel)] px-3 py-1.5 md:max-w-lg md:px-4 md:py-2.5">
        <UPagination v-model:page="page" :size="miniPaginationSize" :items-per-page="itemsPerPage" :total="total" :to="to" :ui="{ root: 'md:w-auto' }" />
        <span class="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted">{{ rangeLabel }}</span>
      </div>
    </Transition>
  </Teleport>
</template>
