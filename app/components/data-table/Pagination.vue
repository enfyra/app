<script setup lang="ts">
import type { TablePaginationProps } from '~/types/table-pagination'

const props = withDefaults(defineProps<TablePaginationProps>(), {
  loading: false,
  showPageSize: false,
})
const page = defineModel<number>('page', { default: 1 })
const emit = defineEmits<{ 'page-size-change': [size: number] }>()
const pageSizes = [10, 20, 50, 100].map(value => ({ label: String(value), value }))
const hasPagination = computed(() => props.total > props.itemsPerPage && props.itemsPerPage > 0)
const pageStart = computed(() => props.total > 0 ? (page.value - 1) * props.itemsPerPage + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * props.itemsPerPage, props.total))
const paginationFooter = shallowRef<HTMLElement | null>(null)
const tableScope = computed(() => props.scope ?? null)
const { isMiniVisible } = useMiniBarVisibility(paginationFooter, tableScope)
const { active: showLoading } = useDeferredBusy(() => props.loading)
const { isMobile } = useScreen()
const showMiniPagination = computed(() => hasPagination.value && isMiniVisible.value)
const miniPaginationSize = computed(() => isMobile.value ? 'xs' : 'sm')

function setPageSize(value: string | number) {
  const size = Number(value)
  if (size === props.itemsPerPage || !pageSizes.some(item => item.value === size)) return
  emit('page-size-change', size)
}
</script>

<template>
  <div ref="paginationFooter" class="eapp-settings-pagination grid grid-cols-2 items-center gap-x-2 gap-y-3 sm:flex sm:flex-wrap sm:justify-between sm:gap-3" aria-label="Table pagination" :aria-busy="loading">
    <div class="min-w-0 text-xs tabular-nums text-muted">
      <span class="whitespace-nowrap">{{ total > 0 ? `${pageStart}–${pageEnd} / ${total}` : '0 results' }}</span>
      <slot name="summary" />
    </div>
    <div class="flex items-center justify-end gap-3 sm:ml-auto">
      <label v-if="showPageSize" class="flex items-center gap-2 whitespace-nowrap text-xs text-muted">
        Rows per page
        <USelect :model-value="itemsPerPage" :items="pageSizes" value-key="value" size="sm" class="w-18" :ui="{ base: '!h-8' }" aria-label="Rows per page" @update:model-value="setPageSize" />
      </label>
      <UIcon v-if="showLoading" name="lucide:loader-circle" class="size-4 animate-spin text-muted" aria-label="Loading page" />
    </div>
    <UPagination
      v-if="hasPagination"
      v-model:page="page"
      :items-per-page="itemsPerPage"
      :total="total"
      :to="to"
      :sibling-count="2"
      size="sm"
      :ui="{ root: '!w-full col-span-2 justify-self-end border-t border-default pt-3 sm:!w-auto sm:col-auto sm:justify-self-auto sm:border-0 sm:pt-0', list: 'flex-wrap justify-end' }"
    />
  </div>
  <Teleport to="body">
    <Transition name="mini-pagination">
      <div v-show="showMiniPagination" class="eapp-pagination eapp-pagination-mini fixed inset-x-3 bottom-3 z-30 mx-auto flex flex-wrap max-w-md items-center justify-between gap-3 rounded-[var(--radius-panel)] px-3 py-1.5 md:max-w-lg md:px-4 md:py-2.5">
        <UPagination v-model:page="page" :size="miniPaginationSize" :items-per-page="itemsPerPage" :total="total" :to="to" :ui="{ root: '!w-auto', list: 'flex-wrap' }" />
        <span class="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted">{{ pageStart }}–{{ pageEnd }} / {{ total }}</span>
      </div>
    </Transition>
  </Teleport>
</template>
