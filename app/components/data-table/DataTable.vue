<script setup lang="ts">
import type { DataTableProps } from "~/types";

const props = withDefaults(defineProps<DataTableProps>(), {
  pageSize: 10,
  loading: false,
  selectable: false,
  contextMenuItems: undefined,
  selectedItems: () => [],
  skeletonRows: 5,
});

const emit = defineEmits<{
  "row-click": [row: any];
  "selection-change": [selectedRows: any[]];
}>();

const { getId } = useDatabase();

const vueTableModule = ref<any>(null)
const loadingTable = ref(true)

onMounted(async () => {
  try {
    
    vueTableModule.value = await import('@tanstack/vue-table')
    loadingTable.value = false
  } catch (error) {
    console.error('Failed to load @tanstack/vue-table:', error)
    loadingTable.value = false
  }
})

type ColumnDef = any
type SortingState = any[]
type VisibilityState = Record<string, boolean>

function handleRowClick(row: any) {
  emit("row-click", row);
}

const sorting = ref<SortingState>([]);
const columnVisibility = ref<VisibilityState>({});
const rowSelection = ref({});

const enhancedColumns = computed(() => {
  if (!props.selectable || !vueTableModule.value) return props.columns;

  const selectColumn: ColumnDef = {
    id: "select",
    header: ({ table }: { table: any }) =>
      h("input", {
        type: "checkbox",
        class: "rounded w-5 h-5 cursor-pointer block",
        checked: table.getIsAllRowsSelected(),
        indeterminate: table.getIsSomeRowsSelected(),
        onChange: table.getToggleAllRowsSelectedHandler(),
        onClick: (e: Event) => e.stopPropagation(),
        "aria-label": "Select all rows",
      }),
    cell: ({ row }: { row: any }) =>
      h(
        "div",
        {
          class: "flex items-center justify-center",
          onClick: (e: Event) => e.stopPropagation(),
        },
        [
          h("input", {
            type: "checkbox",
            class: "rounded w-5 h-5 cursor-pointer",
            checked: row.getIsSelected(),
            disabled: !row.getCanSelect(),
            onChange: row.getToggleSelectedHandler(),
            onClick: (e: Event) => e.stopPropagation(),
            "aria-label": `Select row ${row.index + 1}`,
          }),
        ]
      ),
    enableSorting: false,
    enableHiding: false,
    size: 50,
    enableResizing: false,
    maxSize: 50,
    minSize: 50,
  };

  return [selectColumn, ...props.columns];
});

const table = computed(() => {
  if (!vueTableModule.value) return null
  
  const {
    useVueTable,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    getFilteredRowModel,
  } = vueTableModule.value

  return useVueTable({
    get data() {
      return props.data;
    },
    get columns() {
      return enhancedColumns.value;
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
    onSortingChange: (updater: any) => {
      sorting.value =
        typeof updater === "function" ? updater(sorting.value) : updater;
    },
    onColumnVisibilityChange: (updater: any) => {
      columnVisibility.value =
        typeof updater === "function" ? updater(columnVisibility.value) : updater;
    },
    onRowSelectionChange: (updater: any) => {
      rowSelection.value =
        typeof updater === "function" ? updater(rowSelection.value) : updater;
    },
    state: {
      get sorting() {
        return sorting.value;
      },
      get columnVisibility() {
        return columnVisibility.value;
      },
      get rowSelection() {
        return rowSelection.value;
      },
    },
    initialState: {
      pagination: {
        pageSize: props.pageSize,
      },
    },
  })
})

const selectedRows = computed(() => {
  if (!table.value) return []
  return table.value.getSelectedRowModel().rows.map((row: any) => row.original);
});

watch(
  () => props.selectedItems,
  (newSelectedItems) => {
    const newRowSelection: Record<string, boolean> = {};
    if (newSelectedItems?.length) {
      newSelectedItems.forEach(id => {
        const rowIndex = props.data.findIndex(row => String(getId(row)) === String(id));
        if (rowIndex >= 0) {
          newRowSelection[rowIndex] = true;
        }
      });
    }

    const currentKeys = Object.keys(rowSelection.value);
    const newKeys = Object.keys(newRowSelection);
    
    if (currentKeys.length !== newKeys.length || 
        !newKeys.every(key => (rowSelection.value as Record<string, boolean>)[key])) {
      rowSelection.value = newRowSelection;
    }
  },
  { immediate: true }
);

watch(
  selectedRows,
  (newSelection) => {
    nextTick(() => {
      emit("selection-change", newSelection);
    });
  },
  { deep: true }
);

function getPrimaryFieldValue(row: any) {
  if (!table.value) return 'N/A'
  const cells = row.getVisibleCells()
  const nameCell = cells.find((cell: any) => 
    ['name', 'title', 'fullName', 'user'].includes(cell.column.id?.toLowerCase() || '')
  )
  if (nameCell) {
    return nameCell.getValue()
  }
  const firstCell = cells.find((cell: any) => 
    cell.column.id !== 'select' && cell.column.id !== '__actions'
  )
  return firstCell ? String(firstCell.getValue()) : 'N/A'
}

function getStatusField(row: any) {
  const cells = row.getVisibleCells()
  const statusCell = cells.find((cell: any) => 
    ['status', 'isActive', 'state'].includes(cell.column.id?.toLowerCase() || '')
  )
  if (statusCell) {
    const value = statusCell.getValue()
    if (typeof value === 'boolean') {
      return value ? 'Active' : 'Inactive'
    }
    return String(value)
  }
  return null
}

function getStatusBadgeColor(status: string | null) {
  if (!status) return 'neutral'
  const lowerStatus = status.toLowerCase()
  if (lowerStatus.includes('active') || lowerStatus === 'yes' || lowerStatus.includes('success')) {
    return 'success'
  }
  if (lowerStatus.includes('pending') || lowerStatus.includes('warning')) {
    return 'warning'
  }
  if (lowerStatus.includes('completed') || lowerStatus.includes('info')) {
    return 'info'
  }
  if (lowerStatus.includes('error') || lowerStatus.includes('failed') || lowerStatus.includes('reject')) {
    return 'error'
  }
  return 'neutral'
}

function getVisibleCellsForCard(row: any) {
  return row.getVisibleCells().filter((cell: any) => {
    const columnId = cell.column.id?.toLowerCase() || ''
    return cell.column.id !== 'select' && 
      cell.column.id !== '__actions' &&
      !['name', 'title', 'fullName', 'user', 'status', 'isActive', 'state', 'id'].includes(columnId) &&
      !columnId.includes('createdat') &&
      !columnId.includes('updatedat')
  })
}

function getCreatedAtValue(row: any) {
  const cell = row.getVisibleCells().find((cell: any) => 
    cell.column.id?.toLowerCase() === 'createdat'
  )
  if (cell) return cell.getValue()
  return row.original?.createdAt || row.original?.created_at || null
}

function getUpdatedAtValue(row: any) {
  const cell = row.getVisibleCells().find((cell: any) => 
    cell.column.id?.toLowerCase() === 'updatedat'
  )
  if (cell) return cell.getValue()
  return row.original?.updatedAt || row.original?.updated_at || null
}

function formatDateTime(value: any) {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      const date = new Date(value)
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: date.getSeconds() > 0 ? '2-digit' : undefined,
        hour12: true
      })
      return `${dateStr}, ${timeStr}`
    } catch {
      return value
    }
  }
  return String(value)
}

function getColumnLabel(columnId: string) {
  if (!table.value) return columnId
  const header = table.value.getFlatHeaders().find((h: any) => h.id === columnId)
  if (header && typeof header.column.columnDef.header === 'string') {
    return header.column.columnDef.header
  }
  return columnId.charAt(0).toUpperCase() + columnId.slice(1).replace(/([A-Z])/g, ' $1')
}
</script>

<template>
  <div class="w-full space-y-4">
    
    <div v-if="loadingTable" class="flex items-center justify-center py-8">
      <CommonLoadingState
        title="Loading table..."
        size="sm"
        type="spinner"
      />
    </div>

    <template v-else-if="table">
      
      <div class="lg:hidden">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <article
            v-for="(row, index) in table.getRowModel().rows"
            :key="row.id"
            class="surface-card rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:bg-[var(--surface-muted)] active:scale-[0.99]"
            :class="selectedRows.some((selectedRow: any) => getId(selectedRow) === getId(row.original)) ? 'ring-2 ring-[var(--color-primary-500)]' : ''"
            @click="handleRowClick(row.original)"
          >
            <header class="flex items-start gap-3 p-4">
              <div v-if="props.selectable" class="pt-0.5 flex-shrink-0" @click.stop>
                <input
                  type="checkbox"
                  class="rounded w-4 h-4 cursor-pointer"
                  :checked="row.getIsSelected()"
                  :disabled="!row.getCanSelect()"
                  @change="row.getToggleSelectedHandler()($event)"
                  :aria-label="`Select row ${row.index + 1}`"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h4
                  class="text-[15px] font-semibold text-[var(--text-primary)] truncate leading-snug"
                  :title="String(getPrimaryFieldValue(row))"
                >
                  {{ getPrimaryFieldValue(row) }}
                </h4>
                <p class="text-[11px] text-[var(--text-tertiary)] font-mono mt-1 truncate">
                  #{{ getId(row.original) }}
                </p>
              </div>
              <UBadge
                v-if="getStatusField(row)"
                :color="getStatusBadgeColor(getStatusField(row))"
                variant="soft"
                size="sm"
                class="flex-shrink-0 capitalize"
                :label="getStatusField(row) ?? undefined"
              />
            </header>

            <dl
              v-if="getVisibleCellsForCard(row).length > 0"
              class="px-4 pb-3 border-t border-[var(--border-default)] pt-3 grid grid-cols-2 gap-x-4 gap-y-3"
            >
              <div
                v-for="cell in getVisibleCellsForCard(row)"
                :key="cell.id"
                class="min-w-0"
              >
                <dt class="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1 truncate">
                  {{ getColumnLabel(cell.column.id) }}
                </dt>
                <dd class="text-sm text-[var(--text-primary)] break-words min-w-0">
                  <component
                    v-if="typeof cell.column.columnDef.cell === 'function'"
                    :is="cell.column.columnDef.cell"
                    v-bind="cell.getContext()"
                  />
                  <span v-else-if="cell.getValue() !== null && cell.getValue() !== undefined && cell.getValue() !== ''" class="line-clamp-2">
                    {{ cell.getValue() }}
                  </span>
                  <span v-else class="text-[var(--text-tertiary)] italic">—</span>
                </dd>
              </div>
            </dl>

            <footer
              v-if="getCreatedAtValue(row) || getUpdatedAtValue(row)"
              class="px-4 py-2.5 border-t border-[var(--border-default)] bg-[var(--surface-muted)]/40 flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)]"
            >
              <UIcon name="lucide:clock-3" class="w-3 h-3 flex-shrink-0" />
              <span class="truncate">
                <template v-if="getUpdatedAtValue(row)">
                  Updated {{ formatDateTime(getUpdatedAtValue(row)) }}
                </template>
                <template v-else>
                  Created {{ formatDateTime(getCreatedAtValue(row)) }}
                </template>
              </span>
            </footer>
          </article>
        </div>

        <div v-if="!loading && props.data.length === 0" class="py-8 text-center">
          <CommonEmptyState
            variant="naked"
            title="No data available"
            description="There are no records to display"
            icon="lucide:database"
            size="sm"
          />
        </div>
        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="i in (props.skeletonRows || 5)"
          :key="`mobile-skeleton-${i}`"
          class="surface-card rounded-xl overflow-hidden animate-pulse"
        >
          <div class="flex items-start gap-3 p-4">
            <div class="flex-1 space-y-2">
              <div class="h-4 skeleton-base rounded w-3/4"></div>
              <div class="h-3 skeleton-base rounded w-20"></div>
            </div>
            <div class="h-5 skeleton-base rounded-full w-16"></div>
          </div>
          <div class="px-4 pb-3 border-t border-[var(--border-default)] pt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <div v-for="j in 4" :key="j" class="space-y-1.5">
              <div class="h-2.5 skeleton-base rounded w-16"></div>
              <div class="h-3.5 skeleton-base rounded w-24"></div>
            </div>
          </div>
          <div class="px-4 py-2.5 border-t border-[var(--border-default)] bg-[var(--surface-muted)]/40">
            <div class="h-3 skeleton-base rounded w-40"></div>
          </div>
        </div>
      </div>
    </div>

    <div
      class="hidden lg:block surface-card rounded-2xl overflow-hidden"
    >
      <div class="max-w-full overflow-x-auto overflow-y-auto custom-scrollbar">
        <table class="min-w-full divide-y divide-[var(--table-header-border)]" aria-label="Data table">
          <thead class="bg-[var(--table-header-bg)]">
            <tr>
              <th
                v-for="header in table?.getFlatHeaders() || []"
                :key="header.id"
                :class="[
                  'px-5 py-3 text-left sm:px-6',
                  header.id === '__actions' ? 'text-center' : 'text-left',
                  header.id === 'select' ? 'w-12 min-w-12 max-w-12' : '',
                  header.id === '__actions' ? 'w-12 min-w-12 max-w-12' : '',
                  header.id?.toLowerCase() === 'id' ? 'w-20 min-w-20 max-w-20' : '',
                  header.id !== 'select' && header.id !== '__actions' && header.id?.toLowerCase() !== 'id'
                    ? 'overflow-hidden'
                    : '',
                  header.column.getCanSort() &&
                    'cursor-pointer select-none hover:bg-[var(--table-header-hover-bg)] transition-colors',
                ]"
                @click="header.column.getToggleSortingHandler()?.($event)"
                scope="col"
                :aria-sort="
                  header.column.getIsSorted() === 'asc'
                    ? 'ascending'
                    : header.column.getIsSorted() === 'desc'
                    ? 'descending'
                    : 'none'
                "
              >
                <div
                  :class="[
                    'flex items-center',
                    header.id === 'select' ? 'justify-center' : 'gap-2',
                    header.id === '__actions' ? 'justify-center' : '',
                  ]"
                >
                  <p
                    v-if="typeof header.column.columnDef.header === 'string'"
                    class="font-medium text-[var(--table-header-color)] text-theme-xs truncate min-w-0 flex-1"
                    :title="header.column.columnDef.header"
                  >
                    {{ header.column.columnDef.header }}
                  </p>
                  <component
                    v-else
                    :is="header.column.columnDef.header"
                    v-bind="header.getContext()"
                  />
                  <UIcon
                    v-if="header.column.getCanSort() && header.id !== 'select'"
                    :name="
                      header.column.getIsSorted() === 'asc'
                        ? 'i-lucide-chevron-up'
                        : header.column.getIsSorted() === 'desc'
                        ? 'i-lucide-chevron-down'
                        : 'i-lucide-chevrons-up-down'
                    "
                    class="w-4 h-4 text-[var(--table-header-color)] flex-shrink-0"
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--table-cell-border)]">
            <template v-if="loading">
              <tr v-for="i in (props.skeletonRows || 5)" :key="`skeleton-${i}`" class="animate-pulse">
                <td
                  v-for="(header, headerIndex) in table?.getFlatHeaders() || []"
                  :key="`skeleton-${i}-${headerIndex}`"
                  :class="[
                    'px-5 py-4 sm:px-6 align-middle',
                    header.id === 'select' ? 'w-12 min-w-12 max-w-12' : '',
                    header.id === '__actions'
                      ? 'w-12 min-w-12 max-w-12'
                      : header.id?.toLowerCase() === 'id'
                      ? 'w-20 min-w-20 max-w-20'
                      : '',
                  ]"
                >
                  <div class="h-4 skeleton-base rounded" :style="{ width: (headerIndex as number) % 3 === 0 ? '80%' : (headerIndex as number) % 3 === 1 ? '60%' : '90%' }"></div>
                </td>
              </tr>
            </template>
            <template v-else v-for="(row, index) in table?.getRowModel().rows || []" :key="row.id">
              
              <UContextMenu
                v-if="props.contextMenuItems"
                :items="props.contextMenuItems(row.original)"
                :disabled="props.contextMenuItems(row.original).length === 0"
              >
                <tr
                  :class="[
                    'group cursor-pointer transition-all duration-200',
                    selectedRows.some((selectedRow: any) => getId(selectedRow) === getId(row.original))
                      ? 'bg-brand-50 dark:bg-brand-500/10'
                      : 'hover:bg-[var(--surface-muted)]',
                  ]"
                  @click="handleRowClick(row.original)"
                >
                  <td
                    v-for="cell in row.getVisibleCells()"
                    :key="cell.id"
                    @click="cell.column.id === 'select' && $event.stopPropagation()"
                :class="[
                  'px-5 py-4 sm:px-6 align-middle',
                      cell.column.id === 'select' ? 'w-12 min-w-12 max-w-12' : '',
                      cell.column.id === '__actions'
                        ? 'w-12 min-w-12 max-w-12'
                        : cell.column.id?.toLowerCase() === 'id'
                        ? 'w-20 min-w-20 max-w-20'
                        : cell.column.id !== 'select' && cell.column.id !== '__actions'
                    ? 'overflow-hidden whitespace-nowrap text-ellipsis'
                        : '',
                    ]"
                  >
                    <p
                  v-if="typeof cell.column.columnDef.cell !== 'function'"
                  class="text-[var(--table-cell-color)] text-theme-sm w-full truncate"
                      :title="String(cell.getValue())"
                    >
                      {{ cell.getValue() }}
                    </p>
                    <component
                      v-else
                      :is="cell.column.columnDef.cell"
                      v-bind="cell.getContext()"
                    />
                  </td>
                </tr>
              </UContextMenu>

              <tr
                v-else
                :class="[
                  'group cursor-pointer transition-all duration-200',
                  selectedRows.some((selectedRow: any) => getId(selectedRow) === getId(row.original))
                    ? 'bg-brand-50 dark:bg-brand-500/10'
                    : 'hover:bg-[var(--surface-muted)]',
                ]"
                @click="handleRowClick(row.original)"
              >
                <td
                  v-for="cell in row.getVisibleCells()"
                  :key="cell.id"
                  @click="cell.column.id === 'select' && $event.stopPropagation()"
                  :class="[
                    'px-5 py-4 sm:px-6 align-middle',
                    cell.column.id === 'select' ? 'w-12 min-w-12 max-w-12' : '',
                    cell.column.id === '__actions'
                      ? 'w-12 min-w-12 max-w-12'
                      : cell.column.id?.toLowerCase() === 'id'
                      ? 'w-20 min-w-20 max-w-20'
                      : cell.column.id !== 'select' && cell.column.id !== '__actions'
                      ? 'overflow-hidden whitespace-nowrap text-ellipsis'
                      : '',
                  ]"
                >
                  <p
                    v-if="typeof cell.column.columnDef.cell !== 'function'"
                    class="text-[var(--table-cell-color)] text-theme-sm w-full truncate"
                    :title="String(cell.getValue())"
                  >
                    {{ cell.getValue() }}
                  </p>
                  <component
                    v-else
                    :is="cell.column.columnDef.cell"
                    v-bind="cell.getContext()"
                  />
                </td>
              </tr>
            </template>
            <tr v-if="!loading && props.data.length === 0">
              <td
                :colspan="table?.getFlatHeaders().length || 0"
                class="px-4 py-8 text-center"
              >
                <CommonEmptyState
                  variant="naked"
                  title="No data available"
                  description="There are no records to display"
                  icon="lucide:database"
                  size="sm"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    </template>
  </div>
</template>
