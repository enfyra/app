<script setup lang="ts">
import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import type { SettingsTableProps } from '~/types/settings-table'
import { contentColumnStyle } from '~/utils/settings-table-sizing'

const props = withDefaults(defineProps<SettingsTableProps>(), {
  loading: false,
  total: 0,
  pageLimit: 0,
  paginationLoading: false,
})

const page = defineModel<number>('page', { default: 1 })
const emit = defineEmits<{
  'row-click': [row: Record<string, any>]
  'page-size-change': [size: number]
}>()
const tableUi = computed(() => ({
  base: 'table-auto !min-w-full',
  th: ['whitespace-nowrap', props.compact ? 'px-3 py-2' : ''].filter(Boolean).join(' '),
  td: ['overflow-hidden text-ellipsis', props.compact ? 'px-3 py-2' : ''].filter(Boolean).join(' '),
}))
const hasPagination = computed(() => props.total > props.pageLimit && props.pageLimit > 0)
const { getId } = useDatabase()
const { buildActionsColumn } = useDataTableColumns()
const idColumn: ColumnDef<Record<string, any>> = {
  id: 'id',
  accessorFn: row => getId(row),
  header: 'ID',
  enableSorting: false,
  cell: ({ getValue }) => {
    const value = getValue()
    const text = value == null || value === '' ? '_' : String(value)
    return h('span', { class: 'inline-block max-w-56 align-middle truncate select-text font-mono', title: text === '_' ? undefined : text }, text)
  },
}
function hasColumnContent(column: ColumnDef<Record<string, any>>, key: string) {
  return props.data.some((row, index) => {
    const value = 'accessorFn' in column && column.accessorFn
      ? column.accessorFn(row, index)
      : 'accessorKey' in column && column.accessorKey
        ? String(column.accessorKey).split('.').reduce((current, part) => current?.[part], row as any)
        : row[key];
    return value !== null && value !== undefined &&
      (typeof value !== 'string' || value.trim() !== '') &&
      (!Array.isArray(value) || value.length > 0);
  });
}

const columns = computed(() => {
  const hasIdColumn = props.columns.some(column =>
    ('accessorKey' in column && (column.accessorKey === 'id' || column.accessorKey === '_id'))
    || column.id === 'id' || column.id === '_id')
  const source = hasIdColumn ? props.columns : [idColumn, ...props.columns]
  const result = source.map(column => {
    const key = String(column.id ?? ('accessorKey' in column ? column.accessorKey : '') ?? '')
    const isId = key === 'id' || key === '_id';
    const sizedColumn = isId && !column.cell ? { ...column, cell: idColumn.cell } : column;
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
    } as ColumnDef<Record<string, any>>;
  })
  if (props.actions) {
    const width = 56
    result.push({
      ...buildActionsColumn({ actions: props.actions }),
      meta: { style: {
        th: { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` },
        td: { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` },
      } },
    } as ColumnDef<Record<string, any>>)
  }
  return result
})
</script>

<template>
  <div class="w-full min-w-0 space-y-4">
    <DataTable
      v-model:page="page"
      :data="data"
      :columns="columns"
      :loading="loading || paginationLoading"
      :ui="tableUi"
      :show-column-visibility="false"
      :pagination-config="pageSizeKey || hasPagination ? { total, itemsPerPage: pageLimit, loading: paginationLoading, showPageSize: Boolean(pageSizeKey), to } : undefined"
      @row-click="row => emit('row-click', row)"
      @page-size-change="size => emit('page-size-change', size)"
    >
      <template v-for="(_, name) in $slots" #[name]="slotData">
        <slot :name="name" v-bind="slotData" />
      </template>
    </DataTable>
  </div>
</template>
