<script setup lang="ts">
import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import type { SettingsTableProps } from '~/types/settings-table'

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
  base: columns.value.length > 6 ? 'table-fixed !min-w-[1200px]' : columns.value.length > 4 ? 'table-fixed !min-w-[960px]' : 'table-fixed !min-w-[640px]',
  th: ['overflow-hidden text-ellipsis', props.compact ? 'px-3 py-2' : ''].filter(Boolean).join(' '),
  td: ['max-w-0 overflow-hidden text-ellipsis', props.compact ? 'px-3 py-2' : ''].filter(Boolean).join(' '),
}))
const hasPagination = computed(() => props.total > props.pageLimit && props.pageLimit > 0)
const tableScope = shallowRef<HTMLElement | null>(null)
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
    return h('span', { class: 'block truncate select-text font-mono', title: text === '_' ? undefined : text }, text)
  },
}
const compactWidths: Record<string, number> = {
  table: 200,
  methods: 200,
  provider: 144,
  colors: 248,
  credential: 180,
  providerUserId: 184,
  clientId: 184,
  correlationId: 176,
  isEnabled: 120,
  status: 120,
  isSystem: 120,
  requireAuth: 120,
  priority: 96,
  position: 120,
  scope: 144,
  combinator: 132,
  type: 136,
  steps: 88,
  timeout: 108,
  events: 88,
  connections: 132,
  publicMethods: 108,
  roles: 168,
  triggers: 160,
  createdAt: 132,
  occurredAt: 184,
}
const columns = computed(() => {
  const hasIdColumn = props.columns.some(column =>
    ('accessorKey' in column && (column.accessorKey === 'id' || column.accessorKey === '_id'))
    || column.id === 'id' || column.id === '_id')
  const source = hasIdColumn ? props.columns : [idColumn, ...props.columns]
  const result = source.map(column => {
    const key = String(column.id ?? ('accessorKey' in column ? column.accessorKey : '') ?? '')
    const width = key === 'id' || key === '_id'
      ? props.data.some(row => typeof getId(row) === 'string' && String(getId(row)).length > 12) ? 224 : 88
      : compactWidths[key]
    if (!width || column.meta?.style?.th || column.meta?.style?.td) return column
    return {
      ...column,
      meta: {
        ...column.meta,
        style: {
          ...column.meta?.style,
          th: { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` },
          td: { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` },
        },
      },
    } as ColumnDef<Record<string, any>>
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
  <div ref="tableScope" class="eapp-page-constrained-wide min-w-0 space-y-4">
    <DataTable :data="data" :columns="columns" :loading="loading" :ui="tableUi" :show-column-visibility="false" @row-click="row => emit('row-click', row)">
      <template v-for="(_, name) in $slots" #[name]="slotData">
        <slot :name="name" v-bind="slotData" />
      </template>
      <template v-if="pageSizeKey || hasPagination" #footer>
        <DataTablePagination
          v-model:page="page"
          :total="total"
          :items-per-page="pageLimit"
          :loading="paginationLoading"
          :show-page-size="Boolean(pageSizeKey)"
          :scope="tableScope"
          :to="to"
          @page-size-change="size => emit('page-size-change', size)"
        />
      </template>
    </DataTable>
  </div>
</template>
