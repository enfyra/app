<script setup lang="ts">
import type { TablePaginationProps } from '~/types/table-pagination'

const props = withDefaults(defineProps<TablePaginationProps>(), {
  mode: 'offset',
  total: 0,
  loading: false,
  showPageSize: false,
  rowCount: 0,
  hasNextPage: false,
  floating: true,
})
const page = defineModel<number>('page', { default: 1 })
const emit = defineEmits<{
  'page-size-change': [size: number]
}>()
const pageSizes = [10, 20, 50, 100].map(value => ({ label: String(value), value }))
const isCursor = computed(() => props.mode === 'cursor')
const hasPagination = computed(() => props.total > props.itemsPerPage && props.itemsPerPage > 0)
const pageStart = computed(() => (isCursor.value ? props.rowCount > 0 : props.total > 0) ? (page.value - 1) * props.itemsPerPage + 1 : 0)
const pageEnd = computed(() => isCursor.value ? props.rowCount > 0 ? pageStart.value + props.rowCount - 1 : 0 : Math.min(page.value * props.itemsPerPage, props.total))
const rangeLabel = computed(() => isCursor.value
  ? props.rowCount > 0 ? `${pageStart.value}–${pageEnd.value}` : '0 results'
  : props.total > 0 ? `${pageStart.value}–${pageEnd.value} / ${props.total}` : '0 results')
const paginationFooter = shallowRef<HTMLElement | null>(null)
const { isMobile } = useScreen()
const canFloat = computed(() => props.floating && (!isCursor.value || isMobile.value))
const floatingTarget = computed(() => canFloat.value ? paginationFooter.value : null)
const tableScope = computed(() => canFloat.value ? props.scope ?? null : null)
const { isMiniVisible } = useMiniBarVisibility(floatingTarget, tableScope)
const { active: showLoading } = useDeferredBusy(() => props.loading)
const showMiniPagination = computed(() => canFloat.value && (isCursor.value ? page.value > 1 || props.hasNextPage : hasPagination.value) && isMiniVisible.value)
const miniPaginationSize = computed(() => isMobile.value ? 'xs' : 'sm')

function setPageSize(value: string | number) {
  const size = Number(value)
  if (size === props.itemsPerPage || !pageSizes.some(item => item.value === size)) return
  emit('page-size-change', size)
}

function setCursorPage(direction: -1 | 1) {
  if (props.loading || (direction === 1 ? !props.hasNextPage : page.value <= 1)) return
  page.value += direction
}
</script>

<template>
  <div ref="paginationFooter" class="eapp-settings-pagination grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-3 md:flex md:flex-wrap md:justify-between md:gap-3" aria-label="Table pagination" :aria-busy="loading">
    <div class="flex min-w-0 items-center gap-3 whitespace-nowrap text-xs tabular-nums text-muted">
      <slot name="summary" />
      <span v-if="$slots.summary" aria-hidden="true">·</span>
      <span>{{ rangeLabel }}</span>
    </div>
    <div class="flex items-center justify-end gap-3 md:ml-auto">
      <label v-if="showPageSize" class="flex items-center gap-2 whitespace-nowrap text-xs text-muted">
        Rows per page
        <USelect :model-value="itemsPerPage" :items="pageSizes" value-key="value" size="sm" class="w-18" aria-label="Rows per page" @update:model-value="setPageSize" />
      </label>
      <UIcon v-if="showLoading" name="lucide:loader-circle" class="size-4 animate-spin text-muted" aria-label="Loading page" />
    </div>
    <div v-if="isCursor || hasPagination" class="col-span-2 min-w-0 -mx-3 border-t border-default px-3 pt-3 md:col-auto md:mx-0 md:border-t-0 md:px-0 md:pt-0">
      <div class="min-w-0 max-w-full overflow-x-auto">
        <div v-if="isCursor" class="mx-auto flex w-fit min-w-max gap-2 md:mx-0">
          <UButton label="Previous" icon="lucide:chevron-left" color="neutral" variant="outline" size="sm" class="h-8" :disabled="page <= 1 || loading" @click="setCursorPage(-1)" />
          <UButton label="Next" trailing-icon="lucide:chevron-right" color="neutral" variant="outline" size="sm" class="h-8" :disabled="!hasNextPage || loading" @click="setCursorPage(1)" />
        </div>
        <UPagination
          v-else
          v-model:page="page"
          :items-per-page="itemsPerPage"
          :total="total"
          :to="to"
          :sibling-count="2"
          size="sm"
          :ui="{ root: 'eapp-table-pagination-controls min-w-max w-fit mx-auto md:mx-0', list: 'w-max flex-nowrap justify-center md:justify-end', item: 'min-w-8 shrink-0' }"
        />
      </div>
    </div>
  </div>
  <Teleport v-if="canFloat" to="body">
    <Transition name="mini-pagination">
      <div v-show="showMiniPagination" class="eapp-pagination eapp-pagination-mini fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-md items-center gap-2 rounded-[var(--radius-panel)] px-3 py-1.5 md:max-w-lg md:gap-4 md:px-4 md:py-2.5" aria-label="Floating table pagination" :aria-busy="loading">
        <div class="min-w-0 flex-1 overflow-x-auto">
          <div v-if="isCursor" class="flex w-max gap-2">
            <UButton label="Previous" icon="lucide:chevron-left" color="neutral" variant="outline" size="sm" class="h-8" :disabled="page <= 1 || loading" @click="setCursorPage(-1)" />
            <UButton label="Next" trailing-icon="lucide:chevron-right" color="neutral" variant="outline" size="sm" class="h-8" :disabled="!hasNextPage || loading" @click="setCursorPage(1)" />
          </div>
          <UPagination v-else v-model:page="page" :size="miniPaginationSize" :items-per-page="itemsPerPage" :total="total" :to="to" :ui="{ root: 'eapp-table-pagination-controls min-w-max w-fit', list: 'flex-nowrap gap-0.5 md:gap-1', item: 'min-w-7 md:min-w-8' }" />
        </div>
        <span class="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted md:text-sm">{{ rangeLabel }}</span>
      </div>
    </Transition>
  </Teleport>
</template>
