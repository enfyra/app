<script setup lang="ts" generic="TRow extends object">
import { h } from 'vue'
import type { CellContext, ColumnDef } from '@tanstack/vue-table'
import { DataTableBulkActions } from '#components'
import type { SettingsTableProps } from '~/types/settings-table'
import type { DataTableProps } from '~/types/ui'
import type { DataTablePaginationConfig } from '~/types/table-pagination'
import type { DataTableSlots } from '~/types/data-table-columns'
import { contentColumnStyle } from '~/utils/settings-table-sizing'

const props = withDefaults(defineProps<SettingsTableProps<TRow>>(), {
  loading: false,
  pageLimit: 0,
  paginationLoading: false,
  paginationMode: 'offset',
  hasNextPage: false,
})

defineSlots<DataTableSlots<TRow>>()
const page = defineModel<number>('page', { default: 1 })
const search = defineModel<string>('search', { default: '' })
const emit = defineEmits<{
  'row-click': [row: TRow]
  'page-size-change': [size: number]
  'search': [value: string]
  'update:selectedRows': [rows: TRow[]]
}>()
const tableUi = computed(() => ({
  base: 'table-auto !min-w-full',
  th: ['whitespace-nowrap', props.compact ? 'px-3 py-2' : ''].filter(Boolean).join(' '),
  td: ['overflow-hidden text-ellipsis', props.compact ? 'px-3 py-2' : ''].filter(Boolean).join(' '),
}))
const total = computed(() => props.total ?? props.data.length)
const hasPagination = computed(() => total.value > props.pageLimit && props.pageLimit > 0)
const slots = useSlots()
const { cellSlotNames, columnSlotNames, contentSlotNames } = useDataTableSlots()
const { getId } = useDatabase()
const selectedRowIds = defineModel<(string | number)[]>('selectedRowIds', { default: () => [] })
const selectionEnabled = computed(() => props.enableRowSelection || !!props.bulkAction?.enabled)
const selectedRows = computed(() => {
  const ids = new Set(selectedRowIds.value.map(String))
  return props.data.filter(row => ids.has(String(getId(row))))
})
const rowSelectionOptions = computed(() => ({
  enableRowSelection: (row: { original: TRow }) => props.bulkAction?.isEligible?.(row.original) ?? true,
}))
const bulkActionsVisible = computed(() => props.bulkAction?.enabled && selectedRows.value.length > 0)

watch([() => props.data, selectionEnabled, () => props.bulkAction?.isEligible], () => {
  const eligible = new Set(props.data
    .filter(row => props.bulkAction?.isEligible?.(row) ?? true)
    .map(row => String(getId(row))))
  const retained = selectionEnabled.value ? selectedRowIds.value.filter(id => eligible.has(String(id))) : []
  if (retained.length !== selectedRowIds.value.length) selectedRowIds.value = retained
})

let lastSelectedRows: TRow[] = []
watch(selectedRows, rows => {
  if (rows.length === lastSelectedRows.length && rows.every((row, index) => row === lastSelectedRows[index])) return
  lastSelectedRows = rows
  emit('update:selectedRows', rows)
}, { flush: 'post' })

async function handleBulkDelete() {
  const action = props.bulkAction
  if (!action?.enabled || action.pending || props.selectionDisabled) return
  const completed = new Set((await action.execute(selectedRows.value)).map(String))
  if (completed.size) selectedRowIds.value = selectedRowIds.value.filter(id => !completed.has(String(id)))
}
function handleRowClick(row: TRow) {
  emit('row-click', row)
}
const { buildActionsColumn } = useDataTableColumns<TRow>()
function renderIdCell({ getValue }: CellContext<TRow, unknown>) {
  const value = getValue()
  const text = value == null || value === '' ? '_' : String(value)
  const isUuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(text)
  const display = isUuid ? `${text.slice(0, 8)}…` : text
  return h('span', { class: 'inline-block max-w-56 align-middle truncate select-text font-mono', title: text === '_' ? undefined : text }, display)
}
const idColumn: ColumnDef<TRow> = {
  id: 'id',
  accessorFn: row => getId(row),
  header: 'ID',
  enableSorting: false,
  cell: renderIdCell,
}
function columnValueAtPath(row: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, part) => current == null ? undefined : Reflect.get(Object(current), part), row)
}
function hasColumnContent(column: ColumnDef<TRow>, key: string) {
  return props.data.some((row, index) => {
    const value = 'accessorFn' in column && column.accessorFn
      ? column.accessorFn(row, index)
      : 'accessorKey' in column && column.accessorKey
        ? columnValueAtPath(row, String(column.accessorKey))
        : columnValueAtPath(row, key);
    return value !== null && value !== undefined &&
      (typeof value !== 'string' || value.trim() !== '') &&
      (!Array.isArray(value) || value.length > 0);
  });
}

const columns = computed<ColumnDef<TRow>[]>(() => {
  const hasIdColumn = props.columns.some(column =>
    ('accessorKey' in column && (column.accessorKey === 'id' || column.accessorKey === '_id'))
    || column.id === 'id' || column.id === '_id')
  const source = hasIdColumn ? props.columns : [idColumn, ...props.columns]
  const result = source.map<ColumnDef<TRow>>(column => {
    const key = String(column.id ?? ('accessorKey' in column ? column.accessorKey : '') ?? '')
    const isId = key === 'id' || key === '_id';
    const sizedColumn = isId && !column.cell ? { ...column, cell: renderIdCell } : column;
    const compact = isId || !hasColumnContent(column, key);
    return {
      ...sizedColumn,
      meta: {
        ...column.meta,
        style: {
          ...column.meta?.style,
          th: contentColumnStyle(column.meta?.style?.th, compact),
          td: contentColumnStyle(column.meta?.style?.td, compact),
        },
      },
    };
  })
  if (props.actions) {
    const width = 56
    result.push({
      ...buildActionsColumn({ actions: row => (props.actions?.(row) ?? []).map(action => ({ ...action, disabled: Boolean(props.bulkAction?.pending || action.disabled) })) }),
      meta: { style: {
        th: { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` },
        td: { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` },
      } },
    })
  }
  return result
})
const paginationConfig = computed<DataTablePaginationConfig | undefined>(() => {
  const shared = { itemsPerPage: props.pageLimit, loading: props.paginationLoading, showPageSize: Boolean(props.pageSizeKey) }
  if (props.paginationMode === 'cursor') return {
    ...shared,
    mode: 'cursor',
    rowCount: props.data.length,
    hasNextPage: props.hasNextPage,
    ...(props.total === undefined ? {} : { total: props.total }),
  }
  return props.pageSizeKey || hasPagination.value ? {
    ...shared,
    total: total.value,
    ...(props.to === undefined ? {} : { to: props.to }),
  } : undefined
})
const tableProps = computed<DataTableProps<TRow>>(() => ({
  data: props.data,
  columns: columns.value,
  headerName: props.headerName,
  loading: props.loading || props.paginationLoading,
  ...(props.headerDescription === undefined ? {} : { headerDescription: props.headerDescription }),
  ...(props.paginationMode === 'cursor' ? props.total === undefined ? {} : { recordCount: props.total } : { recordCount: total.value }),
  ...(props.searchable === undefined ? {} : { searchable: props.searchable }),
  ...(props.searchPlaceholder === undefined ? {} : { searchPlaceholder: props.searchPlaceholder }),
  ...(props.searchLabel === undefined ? {} : { searchLabel: props.searchLabel }),
  ...(paginationConfig.value === undefined ? {} : { paginationConfig: paginationConfig.value }),
  ...(props.reload === undefined ? {} : { reload: props.reload }),
  ...(props.reloadLoading === undefined ? {} : { reloadLoading: props.reloadLoading }),
  ui: tableUi.value,
  enableRowSelection: selectionEnabled.value,
  selectionDisabled: Boolean(props.selectionDisabled || props.bulkAction?.pending),
  rowSelectionOptions: rowSelectionOptions.value,
}))
</script>

<template>
  <div class="w-full min-w-0 space-y-4">
    <!-- @vue-generic {TRow} -->
    <DataTable
      v-bind="tableProps"
      v-model:page="page"
      v-model:selected-row-ids="selectedRowIds"
      v-model:search="search"
      @search="value => emit('search', value)"
      @row-click="handleRowClick"
      @page-size-change="size => emit('page-size-change', size)"
    >
      <template v-if="slots.toolbar" #toolbar="slotData">
        <slot name="toolbar" v-bind="slotData" />
      </template>
      <template v-if="slots['toolbar-actions'] || bulkActionsVisible" #toolbar-actions="slotData">
        <slot name="toolbar-actions" v-bind="slotData" />
        <DataTableBulkActions v-if="bulkActionsVisible && bulkAction" :count="selectedRows.length" :on-delete="handleBulkDelete" :label="bulkAction.label" :loading="bulkAction.pending" />
      </template>
      <template v-if="selectedRows.length || slots['pagination-summary']" #pagination-summary="slotData">
        <span v-if="selectedRows.length">{{ selectedRows.length }} selected</span>
        <slot name="pagination-summary" v-bind="slotData" />
      </template>
      <template v-for="name in cellSlotNames" #[name]="slotData">
        <slot :name="name" v-bind="slotData" />
      </template>
      <template v-for="name in columnSlotNames" #[name]="slotData">
        <slot :name="name" v-bind="slotData" />
      </template>
      <template v-for="name in contentSlotNames" #[name]="slotData">
        <slot :name="name" v-bind="slotData" />
      </template>
      <template v-if="slots.expanded" #expanded="slotData">
        <slot name="expanded" v-bind="slotData" />
      </template>
      <template v-if="slots.footer" #footer="slotData">
        <slot name="footer" v-bind="slotData" />
      </template>
    </DataTable>
  </div>
</template>
