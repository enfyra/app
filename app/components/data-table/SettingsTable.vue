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
const pageSizes = [10, 20, 50, 100].map(value => ({ label: String(value), value }))
const tableUi = computed(() => ({
  base: columns.value.length > 6 ? 'table-fixed !min-w-[1200px]' : columns.value.length > 4 ? 'table-fixed !min-w-[960px]' : 'table-fixed !min-w-[640px]',
  th: ['overflow-hidden text-ellipsis', props.compact ? 'px-3 py-2' : ''].filter(Boolean).join(' '),
  td: ['max-w-0 overflow-hidden text-ellipsis', props.compact ? 'px-3 py-2' : ''].filter(Boolean).join(' '),
}))
const hasPagination = computed(() => props.total > props.pageLimit && props.pageLimit > 0)
const pageStart = computed(() => props.total > 0 ? (page.value - 1) * props.pageLimit + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * props.pageLimit, props.total))
const paginationFooter = shallowRef<HTMLElement | null>(null)
const tableScope = shallowRef<HTMLElement | null>(null)
const { isMiniVisible } = useMiniBarVisibility(paginationFooter, tableScope)
const showMiniPagination = computed(() => hasPagination.value && isMiniVisible.value)
const { isMobile } = useScreen()
const miniPaginationSize = computed(() => isMobile.value ? 'xs' : 'sm')
function setPageSize(value: string | number) {
  const size = Number(value)
  if (size === props.pageLimit || !pageSizes.some(item => item.value === size)) return
  emit('page-size-change', size)
}
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
        <div ref="paginationFooter" class="eapp-settings-pagination grid grid-cols-2 items-center gap-x-2 gap-y-3 sm:flex sm:flex-wrap sm:justify-between sm:gap-3">
          <span class="whitespace-nowrap text-xs tabular-nums text-muted">
            {{ total > 0 ? `${pageStart}–${pageEnd} / ${total}` : '0 results' }}
          </span>
          <div class="flex items-center justify-end gap-3 sm:ml-auto">
            <label v-if="pageSizeKey" class="flex items-center gap-2 whitespace-nowrap text-xs text-muted">
              Rows per page
              <USelect
                :model-value="pageLimit"
                :items="pageSizes"
                value-key="value"
                size="sm"
                class="w-18"
                :ui="{ base: '!h-8' }"
                aria-label="Rows per page"
                @update:model-value="setPageSize"
              />
            </label>
            <UIcon v-if="paginationLoading" name="lucide:loader-circle" class="size-4 animate-spin text-muted" aria-label="Loading page" />
          </div>
          <UPagination
            v-if="hasPagination"
            v-model:page="page"
            :items-per-page="pageLimit"
            :total="total"
            :to="to"
            :sibling-count="isMobile ? 1 : 2"
            size="sm"
            :ui="{ root: '!w-full col-span-2 justify-self-end border-t border-default pt-3 sm:!w-auto sm:col-auto sm:justify-self-auto sm:border-0 sm:pt-0', list: 'flex-nowrap justify-end', first: 'max-md:!hidden', last: 'max-md:!hidden' }"
          />
        </div>
      </template>
    </DataTable>
    <Teleport to="body">
      <Transition name="mini-pagination">
        <div
          v-show="showMiniPagination"
          class="eapp-pagination eapp-pagination-mini fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-[var(--radius-panel)] px-3 py-1.5 md:max-w-lg md:px-4 md:py-2.5"
        >
          <UPagination
            v-model:page="page"
            :size="miniPaginationSize"
            :items-per-page="pageLimit"
            :total="total"
            :to="to"
            :ui="{ root: '!w-auto', list: 'flex-nowrap', first: 'max-md:!hidden', last: 'max-md:!hidden' }"
          />
          <span class="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted">{{ pageStart }}–{{ pageEnd }} / {{ total }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
