<script setup lang="ts" generic="TRow extends object">
import { UContextMenu } from '#components'
import type { CellContext, Column, ColumnDef, HeaderContext, Row, RowSelectionState, SortingState, VisibilityState } from '@tanstack/vue-table'
import type { ContextMenuItem, DropdownMenuItem } from '@nuxt/ui'
import type { TableProps } from '@nuxt/ui/components/Table.vue'
import { tv } from '@nuxt/ui/utils/tv'
import theme from '#build/ui/table'
import type { DataTableProps } from '~/types/ui'
import type { DataTableInstance, DataTableSlots } from '~/types/data-table-columns'
import { createSelectionColumn, selectionCheckboxUi } from '~/utils/data-table-selection'

const props = withDefaults(defineProps<DataTableProps<TRow>>(), {
  loading: false,
  showColumnVisibility: true,
  enableRowSelection: false,
  rowSelectionMode: 'multiple',
})

defineSlots<DataTableSlots<TRow>>()
const emit = defineEmits<{
  'row-click': [row: TRow]
  'page-size-change': [size: number]
  'search': [value: string]
  'update:selectedRows': [rows: TRow[]]
  'update:selectedRowIds': [ids: (string | number)[]]
}>()

const slots = useSlots()
const wrapperKeys = new Set(['contextMenuItems', 'showColumnVisibility', 'enableRowSelection', 'rowSelectionMode', 'selectedRowIds', 'selectionDisabled', 'selectOnRowClick', 'headerName', 'headerDescription', 'recordCount', 'onSelect', 'onContextmenu', 'class', 'ui', 'data', 'columns', 'loading', 'watchOptions', 'paginationConfig', 'page', 'sorting', 'columnVisibility', 'rowSelection', 'rowSelectionOptions', 'reload', 'reloadLoading', 'searchable', 'searchPlaceholder', 'searchLabel', 'search'])
const search = defineModel<string>('search', { default: '' })
const explicitTotal = computed(() => {
  if (typeof props.recordCount === 'number') return props.recordCount
  const total = props.paginationConfig?.total
  return typeof total === 'number' && total >= 0 ? total : undefined
})
const recordCount = computed(() => explicitTotal.value ?? props.data.length)
const showRecordCount = computed(() => props.paginationConfig?.mode !== 'cursor' || explicitTotal.value !== undefined)
const tableOptions = computed(() => {
  const options: TableProps<TRow> = {}
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined && !wrapperKeys.has(key)) Object.assign(options, { [key]: value })
  }
  if (props.contextMenuItems || props.onContextmenu) options.onContextmenu = onContextmenu
  return options
})
const tableRef = useTemplateRef<DataTableInstance<TRow>>('tableRef')
const page = defineModel<number>('page', { default: 1 })
const tableScope = shallowRef<HTMLElement | null>(null)
const sorting = defineModel<SortingState>('sorting', { default: () => [] })
const columnVisibility = defineModel<VisibilityState>('columnVisibility', { default: () => ({}) })
const rowSelection = defineModel<RowSelectionState>('rowSelection', { default: () => ({}) })
const rowSelectionOptions = computed(() => ({
  ...(props.rowSelectionOptions ?? {}),
  ...(props.enableRowSelection
    ? { enableRowSelection: (row: Row<TRow>) => {
        const eligibility = props.rowSelectionOptions?.enableRowSelection
        return !props.selectionDisabled
          && (typeof eligibility === 'function' ? eligibility(row) : eligibility !== false)
      }, enableMultiRowSelection: props.rowSelectionMode !== 'single' }
    : {}),
}))
const selectionIdByKey = new Map<string, string | number>()
function rowIdOf(row: TRow, index = 0, parent?: Row<TRow>): string | number | undefined {
  if (props.getRowId) return props.getRowId(row, index, parent)
  const id: unknown = ('id' in row ? row.id : undefined) ?? ('_id' in row ? row._id : undefined)
  return typeof id === 'string' || typeof id === 'number' ? id : undefined
}
function rowKeyOf(row: TRow, index = 0, parent?: Row<TRow>): string {
  return String(rowIdOf(row, index, parent) ?? (parent ? `${parent.id}.${index}` : index))
}
const isSelectionControlled = computed(() => Array.isArray(props.selectedRowIds))
const selectedKeys = computed(() => Object.entries(rowSelection.value)
  .filter(([, selected]) => selected)
  .map(([key]) => key))
const selectedRows = computed(() => {
  if (!props.enableRowSelection) return []
  const keys = new Set(selectedKeys.value)
  return props.data.filter((row, index) => keys.has(rowKeyOf(row, index)))
})
const selectedRowIdValues = computed(() => {
  if (!props.enableRowSelection) return []
  const idByKey = new Map(props.data.map((row, index) => [rowKeyOf(row, index), rowIdOf(row, index)]))
  return selectedKeys.value.map((key) => idByKey.get(key) ?? selectionIdByKey.get(key) ?? key)
})

watch(() => props.selectedRowIds, (ids) => {
  if (!Array.isArray(ids)) return
  selectionIdByKey.clear()
  for (const id of ids) selectionIdByKey.set(String(id), id)
  const next = Object.fromEntries(ids.map((id) => [String(id), true]))
  const current = selectedKeys.value
  const nextKeys = Object.keys(next)
  if (current.length === nextKeys.length && nextKeys.every((key) => rowSelection.value[key])) return
  rowSelection.value = next
}, { immediate: true })

let lastEmittedSelection: string | null = null
watch([selectedRowIdValues, () => props.data], () => {
  if (!props.enableRowSelection) return
  const ids = selectedRowIdValues.value
  const signature = ids.map((id) => `${typeof id}:${String(id)}`).join('\u0000')
  if (signature === lastEmittedSelection) return
  lastEmittedSelection = signature
  emit('update:selectedRowIds', ids)
  emit('update:selectedRows', selectedRows.value)
}, { flush: 'post' })

watch(() => props.data, (rows) => {
  if (!props.enableRowSelection || isSelectionControlled.value) return
  const visible = new Set(rows.map((row, index) => rowKeyOf(row, index)))
  const retained = selectedKeys.value.filter((key) => visible.has(key))
  if (retained.length === selectedKeys.value.length) return
  rowSelection.value = Object.fromEntries(retained.map((key) => [key, true]))
})
const menuItems = shallowRef<ContextMenuItem[]>([])
const menuWrapper = computed(() => props.contextMenuItems ? UContextMenu : 'div')
const hasActionTier = () => !!slots.toolbar || !!slots['toolbar-actions'] || (props.showColumnVisibility && visibilityItems.value.length > 0) || !!props.reload
const visibilityItems = computed<DropdownMenuItem[]>(() => tableRef.value?.tableApi?.getAllColumns()
  .filter(column => column.getCanHide())
  .map(column => ({
    id: column.id,
    type: 'checkbox' as const,
    label: typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id,
    checked: column.getIsVisible(),
    onUpdateChecked: (checked: boolean) => column.toggleVisibility(checked),
    onSelect: (event: Event) => event.preventDefault(),
  })) ?? [])

const columns = computed<ColumnDef<TRow>[]>(() => props.columns.map((column) => {
  const id = String(column.id ?? ('accessorKey' in column ? column.accessorKey : '') ?? '')
  const width = column.size
  if (!['id', '_id'].includes(id.toLowerCase()) || !width) return column
  return {
    ...column,
    meta: {
      ...column.meta,
      class: { ...column.meta?.class, th: 'font-mono', td: 'max-w-0 overflow-hidden text-ellipsis font-mono' },
      style: {
        ...column.meta?.style,
        th: { width: `${width}px`, minWidth: `${column.minSize ?? width}px`, maxWidth: `${column.maxSize ?? width}px` },
        td: { width: `${width}px`, minWidth: `${column.minSize ?? width}px`, maxWidth: `${column.maxSize ?? width}px` },
      },
    },
  }
}))

const SKELETON_BAR_WIDTHS = ['w-4/5', 'w-3/5', 'w-2/3', 'w-1/2']
const skeletonActive = computed(() => props.loading && !props.data.length && !slots.loading && columns.value.length > 0)
const skeletonRowCount = computed(() => Math.max(1, Math.floor(props.paginationConfig?.itemsPerPage || 10)))
const tableColumns = computed<ColumnDef<TRow>[]>(() => props.enableRowSelection
  ? [createSelectionColumn<TRow>({ multiple: props.rowSelectionMode !== 'single', disabled: Boolean(skeletonActive.value || props.selectionDisabled) }), ...columns.value]
  : columns.value)
const skeletonColumns = computed(() => tableRef.value?.tableApi?.getVisibleLeafColumns() ?? [])
const { cellSlotNames, columnSlotNames, contentSlotNames } = useDataTableSlots()
const nativeContentSlotNames = computed(() => contentSlotNames.value.filter(name => name !== 'body-top'))
const activeCellSlotNames = computed(() => skeletonActive.value ? [] : cellSlotNames.value)
const appConfig = useAppConfig()
const nativeUi = computed(() => tv({ extend: theme, ...appConfig.ui?.table })({
  sticky: props.sticky,
  loading: props.loading,
  loadingColor: props.loadingColor,
  loadingAnimation: props.loadingAnimation,
}))
function isHeaderContext(context: CellContext<TRow, unknown> | HeaderContext<TRow, unknown>): context is HeaderContext<TRow, unknown> {
  return 'header' in context
}
function skeletonCellClass(column: Column<TRow>) {
  const value = column.columnDef.meta?.class?.td
  return nativeUi.value.td({
    class: [props.ui?.td, typeof value === 'function' ? undefined : value],
    pinned: !!column.getIsPinned(),
  })
}
function skeletonCellStyle(column: Column<TRow>) {
  const pinned = column.getIsPinned()
  const value = column.columnDef.meta?.style?.td
  return [
    pinned === 'left' ? { left: `${column.getStart('left')}px` } : pinned === 'right' ? { right: `${column.getAfter('right')}px` } : {},
    typeof value === 'function' ? undefined : value,
  ]
}
function onRowSelect(event: Event, row: Row<TRow>) {
  if (props.enableRowSelection && props.selectOnRowClick && row.getCanSelect()) row.toggleSelected()
  props.onSelect?.(event, row)
  emit('row-click', row.original)
}
function onContextmenu(event: Event, row: Row<TRow>) {
  menuItems.value = props.contextMenuItems?.(row.original) ?? []
  if (!menuItems.value.length && props.contextMenuItems) event.preventDefault()
  if (Array.isArray(props.onContextmenu)) props.onContextmenu.forEach(handler => handler(event, row))
  else props.onContextmenu?.(event, row)
}

defineExpose({
  get tableApi() { return tableRef.value?.tableApi },
  get tableRef() { return tableRef.value?.tableRef },
})
</script>

<template>
  <div ref="tableScope" class="eapp-data-table min-w-0 w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-structural)] bg-default">
    <span v-if="skeletonActive" role="status" class="sr-only">Loading records...</span>
    <div class="eapp-table-toolbar flex flex-col border-b border-[var(--border-structural)] bg-[var(--surface-header)]">
      <div class="flex flex-wrap items-center md:flex-nowrap">
        <div class="flex min-h-11 min-w-0 flex-1 items-center px-3 py-2 md:min-h-14 md:px-4 md:py-3">
          <div class="min-w-0">
            <div class="flex min-w-0 items-center gap-3">
              <span class="eapp-table-title min-w-0 truncate text-sm font-semibold text-highlighted" :title="props.headerName">{{ props.headerName }}</span>
              <UBadge v-if="showRecordCount" color="neutral" variant="subtle" :label="`${recordCount.toLocaleString()} records`" aria-live="polite" class="hidden shrink-0 md:inline-flex" />
            </div>
            <span v-if="props.headerDescription" class="mt-0.5 block max-w-full truncate text-xs text-muted" :title="props.headerDescription">{{ props.headerDescription }}</span>
          </div>
        </div>
        <div class="flex min-h-11 w-full min-w-0 items-center gap-2 border-t border-[var(--border-structural)] px-3 py-2 md:min-h-14 md:w-auto md:border-t-0 md:px-4 md:py-3" :class="hasActionTier() ? undefined : 'md:hidden'">
          <UBadge v-if="showRecordCount" color="neutral" variant="subtle" :label="`${recordCount.toLocaleString()} records`" class="shrink-0 md:hidden" aria-hidden="true" />
          <div v-if="hasActionTier()" class="ml-auto flex min-h-8 min-w-0 items-center justify-end gap-2">
            <slot name="toolbar" :table-api="tableRef?.tableApi" />
            <slot name="toolbar-actions" :table-api="tableRef?.tableApi" />
            <UDropdownMenu
              v-if="props.showColumnVisibility && visibilityItems.length"
              :items="visibilityItems"
              :content="{ align: 'end' }"
              :ui="{ item: 'cursor-pointer pointer-coarse:min-h-[44px]' }"
            >
              <UButton type="button" icon="lucide:columns-3" color="neutral" variant="outline" size="sm" square aria-label="Choose visible columns" />
            </UDropdownMenu>
            <UButton
              v-if="props.reload"
              type="button"
              icon="lucide:refresh-cw"
              color="neutral"
              variant="outline"
              size="sm"
              square
              aria-label="Reload records"
              :loading="props.reloadLoading ?? props.loading"
              @click="props.reload?.()"
            />
          </div>
        </div>
      </div>
      <div v-if="props.searchable" class="flex min-h-11 min-w-0 items-center border-t border-[var(--border-structural)] px-3 py-2 md:min-h-14 md:px-4 md:py-3">
        <CommonSearchField
          v-model="search"
          :placeholder="props.searchPlaceholder || 'Search records'"
          :label="props.searchLabel || props.searchPlaceholder || 'Search records'"
          :loading="props.loading"
          @search="value => emit('search', value)"
        />
      </div>
    </div>
    <component :is="menuWrapper" v-bind="props.contextMenuItems ? { items: menuItems } : {}">
      <!-- @vue-generic {TRow} -->
      <UTable
        ref="tableRef"
        v-bind="{ ...tableOptions, ...$attrs }"
        :data="props.data"
        :get-row-id="rowKeyOf"
        :columns="tableColumns"
        :loading="props.loading"
        :watch-options="props.watchOptions ?? { deep: false }"
        :ui="{ ...props.ui, root: ['eapp-table-scroll overflow-x-auto', props.ui?.root].filter(Boolean).join(' '), base: ['w-full min-w-max', props.ui?.base].filter(Boolean).join(' '), tbody: [skeletonActive ? 'eapp-table-skeleton-body' : '', props.ui?.tbody].filter(Boolean).join(' '), tr: ['data-[selectable=true]:cursor-pointer', props.ui?.tr].filter(Boolean).join(' ') }"
        v-model:sorting="sorting"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        :row-selection-options="rowSelectionOptions"
        :on-select="onRowSelect"
      >
        <template #body-top>
          <slot name="body-top" />
          <template v-if="skeletonActive">
            <tr v-for="rowIndex in skeletonRowCount" :key="rowIndex" data-slot="tr" class="eapp-table-skeleton-row" :class="nativeUi.tr({ class: props.ui?.tr })" aria-hidden="true" inert>
              <td v-for="(column, columnIndex) in skeletonColumns" :key="column.id" data-slot="td" :data-pinned="column.getIsPinned()" :class="skeletonCellClass(column)" :style="skeletonCellStyle(column)">
                <div v-if="column.id === '__actions'" class="invisible pointer-events-none flex items-center justify-center">
                  <UButton icon="lucide:ellipsis-vertical" size="lg" variant="ghost" color="neutral" tabindex="-1" aria-hidden="true" />
                </div>
                <UCheckbox v-else-if="column.id === 'select'" size="lg" :ui="selectionCheckboxUi" class="invisible pointer-events-none" :model-value="false" disabled tabindex="-1" aria-hidden="true" />
                <div v-else class="eapp-table-skeleton h-5 max-w-48 animate-pulse rounded-md bg-elevated" :class="SKELETON_BAR_WIDTHS[columnIndex % SKELETON_BAR_WIDTHS.length]" aria-hidden="true" />
              </td>
            </tr>
          </template>
        </template>
        <template v-for="name in activeCellSlotNames" #[name]="slotData">
          <slot :name="name" v-bind="slotData" />
        </template>
        <template v-for="name in columnSlotNames" #[name]="slotData">
          <slot v-if="isHeaderContext(slotData)" :name="name" v-bind="slotData" />
        </template>
        <template v-for="name in nativeContentSlotNames" #[name]="slotData">
          <slot :name="name" v-bind="slotData" />
        </template>
        <template v-if="slots.expanded" #expanded="slotData">
          <slot name="expanded" v-bind="slotData" />
        </template>
        <template v-if="!slots.loading" #loading>
          <span v-if="skeletonActive" aria-hidden="true" hidden />
          <span v-else role="status" class="sr-only">Loading records...</span>
        </template>
        <template v-if="!slots.empty" #empty>
          <CommonEmptyState v-if="!props.loading" variant="naked" title="No data available" description="There are no records to display" icon="lucide:database" size="sm" />
        </template>
      </UTable>
    </component>
    <div v-if="slots.footer || props.paginationConfig || slots['pagination-summary']" class="eapp-table-footer space-y-3 border-t border-[var(--border-structural)] px-3 py-3 text-sm text-muted md:px-4">
      <slot name="footer" :table-api="tableRef?.tableApi" />
      <DataTablePagination
        v-if="props.paginationConfig"
        v-bind="props.paginationConfig"
        v-model:page="page"
        :row-count="props.paginationConfig.rowCount ?? props.data.length"
        :scope="tableScope"
        @page-size-change="size => emit('page-size-change', size)"
      >
        <template v-if="slots['pagination-summary']" #summary>
          <slot name="pagination-summary" :table-api="tableRef?.tableApi" />
        </template>
      </DataTablePagination>
      <div v-else-if="slots['pagination-summary']" class="flex min-h-8 items-center">
        <slot name="pagination-summary" :table-api="tableRef?.tableApi" />
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.eapp-table-skeleton-body > tr:has(> [data-slot='loading'])) {
  display: none;
}
:deep(.eapp-table-skeleton-body > .eapp-table-skeleton-row:has(+ tr:last-child > [data-slot='loading'])) {
  border-bottom-width: 0;
}
:deep(.eapp-table-scroll) {
  scrollbar-color: var(--ui-border-accented) var(--ui-bg);
  scrollbar-width: thin;
}
:deep(.eapp-table-scroll) tbody > :not(:last-child) {
  border-color: var(--border-structural);
}
:deep(.eapp-table-scroll) tr[data-slot='separator'] {
  background-color: var(--border-structural);
}
:deep(.eapp-table-scroll::-webkit-scrollbar) {
  height: 8px;
}
:deep(.eapp-table-scroll::-webkit-scrollbar-track) {
  background: var(--ui-bg);
  border-top: 1px solid var(--ui-border);
}
:deep(.eapp-table-scroll::-webkit-scrollbar-thumb) {
  border: 2px solid var(--ui-bg);
  border-radius: 999px;
  background: var(--ui-border-accented);
}
</style>
