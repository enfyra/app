<script setup lang="ts">
import { UContextMenu } from '#components'
import type { ColumnDef, RowSelectionState, SortingState, Table, VisibilityState } from '@tanstack/vue-table'
import type { DataTableProps } from '~/types/ui'

const props = withDefaults(defineProps<DataTableProps>(), {
  loading: false,
  skeletonRows: 5,
  showColumnVisibility: true,
})

const emit = defineEmits<{
  'row-click': [row: Record<string, any>]
  'load-more': []
  'page-size-change': [size: number]
}>()

const slots = useSlots()
const wrapperKeys = new Set(['contextMenuItems', 'skeletonRows', 'showColumnVisibility', 'onSelect', 'onContextmenu', 'class', 'ui', 'data', 'columns', 'loading', 'watchOptions', 'paginationConfig', 'page'])
const tableOptions = computed(() => Object.fromEntries(Object.entries(props).filter(([key]) => !wrapperKeys.has(key))))
const tableRef = useTemplateRef<{ tableApi?: Table<Record<string, any>>; tableRef?: HTMLElement }>('tableRef')
const page = defineModel<number>('page', { default: 1 })
const tableScope = shallowRef<HTMLElement | null>(null)
const sorting = defineModel<SortingState>('sorting', { default: () => [] })
const columnVisibility = defineModel<VisibilityState>('columnVisibility', { default: () => ({}) })
const rowSelection = defineModel<RowSelectionState>('rowSelection', { default: () => ({}) })
const menuItems = ref<any[]>([])
const menuWrapper = computed(() => props.contextMenuItems ? UContextMenu : 'div')
const showInitialLoading = computed(() => props.loading && props.data.length === 0)
const visibilityItems = computed(() => tableRef.value?.tableApi?.getAllColumns()
  .filter(column => column.getCanHide())
  .map(column => ({
    label: typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id,
    type: 'checkbox' as const,
    checked: column.getIsVisible(),
    onUpdateChecked: (checked: boolean) => column.toggleVisibility(checked),
    onSelect: (event: Event) => event.preventDefault(),
  })) ?? [])

const columns = computed<ColumnDef<Record<string, any>>[]>(() => props.columns.map((column) => {
  const id = String(column.id ?? ('accessorKey' in column ? column.accessorKey : '') ?? '')
  const width = column.size
  if (!['id', '_id'].includes(id.toLowerCase()) || !width) return column as ColumnDef<Record<string, any>>
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
  } as ColumnDef<Record<string, any>>
}))

function onContextmenu(event: Event, row: { original: Record<string, any> }) {
  menuItems.value = props.contextMenuItems?.(row.original) ?? []
  if (!menuItems.value.length && props.contextMenuItems) event.preventDefault()
  if (Array.isArray(props.onContextmenu)) props.onContextmenu.forEach((handler) => handler(event, row as any))
  else props.onContextmenu?.(event, row as any)
}

defineExpose({
  get tableApi() { return tableRef.value?.tableApi },
  get tableRef() { return tableRef.value?.tableRef },
})
</script>

<template>
  <div ref="tableScope" class="min-w-0 w-full overflow-hidden rounded-lg border border-default bg-default">
    <div v-if="slots.toolbar || props.showColumnVisibility" class="flex flex-wrap items-center justify-between gap-3 border-b border-default px-4 py-3">
      <div v-if="slots.toolbar" class="flex flex-wrap items-center gap-3">
        <slot name="toolbar" :table-api="tableRef?.tableApi" />
      </div>
      <UDropdownMenu v-if="props.showColumnVisibility && visibilityItems.length" :items="visibilityItems" :content="{ align: 'end' }">
        <UButton type="button" label="Columns" icon="lucide:columns-3" color="neutral" variant="outline" size="sm" aria-label="Choose visible columns" />
      </UDropdownMenu>
    </div>
    <component :is="menuWrapper" :items="props.contextMenuItems ? menuItems : undefined">
      <UTable
        ref="tableRef"
        v-bind="{ ...tableOptions, ...$attrs }"
        :data="showInitialLoading ? [] : props.data"
        :columns="columns"
        :loading="props.loading"
        :watch-options="props.watchOptions ?? { deep: false }"
        :ui="{ ...props.ui, root: ['eapp-table-scroll overflow-x-auto', props.ui?.root].filter(Boolean).join(' '), base: ['w-full min-w-max', props.ui?.base].filter(Boolean).join(' '), tr: ['data-[selectable=true]:cursor-pointer', props.ui?.tr].filter(Boolean).join(' ') }"
        v-model:sorting="sorting"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        :on-select="(event, row) => { props.onSelect?.(event, row); emit('row-click', row.original) }"
        :on-contextmenu="props.contextMenuItems || props.onContextmenu ? onContextmenu : undefined"
      >
        <template v-for="(_, name) in slots" #[name]="slotData">
          <slot :name="name" v-bind="slotData" />
        </template>
        <template v-if="!slots.loading" #loading>
          <div class="space-y-3 p-4" aria-label="Loading table">
            <USkeleton v-for="index in props.skeletonRows" :key="index" class="h-9 w-full" />
          </div>
        </template>
        <template v-if="!slots.empty" #empty>
          <CommonEmptyState v-if="!showInitialLoading" variant="naked" title="No data available" description="There are no records to display" icon="lucide:database" size="sm" />
        </template>
      </UTable>
    </component>
    <div v-if="slots.footer || props.paginationConfig" class="space-y-3 border-t border-default px-4 py-3 text-sm text-muted">
      <slot name="footer" :table-api="tableRef?.tableApi" />
      <DataTablePagination
        v-if="props.paginationConfig"
        v-bind="props.paginationConfig"
        v-model:page="page"
        :loaded-count="props.paginationConfig.loadedCount ?? props.data.length"
        :scope="tableScope"
        @load-more="emit('load-more')"
        @page-size-change="size => emit('page-size-change', size)"
      />
    </div>
  </div>
</template>

<style scoped>
:deep(.eapp-table-scroll) {
  scrollbar-color: var(--ui-border-accented) var(--ui-bg);
  scrollbar-width: thin;
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
