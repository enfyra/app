<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import type { DataTableProps } from "../../utils/types";

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
    if (!newSelectedItems) return;

    const newRowSelection: Record<string, boolean> = {};
    newSelectedItems.forEach(id => {
      const rowIndex = props.data.findIndex(row => row.id === id);
      if (rowIndex >= 0) {
        newRowSelection[rowIndex] = true;
      }
    });

    const currentKeys = Object.keys(rowSelection.value);
    const newKeys = Object.keys(newRowSelection);
    
    if (currentKeys.length !== newKeys.length || 
        !newKeys.every(key => (rowSelection.value as Record<string, boolean>)[key])) {
      rowSelection.value = newRowSelection;
    }
  },
  { immediate: true }
);

let emitTimeout: NodeJS.Timeout;
watch(
  selectedRows,
  (newSelection) => {
    clearTimeout(emitTimeout);
    emitTimeout = setTimeout(() => {
      emit("selection-change", newSelection);
    }, 10);
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

function getStatusClass(status: string | null) {
  if (!status) return ''
  const lowerStatus = status.toLowerCase()
  if (lowerStatus.includes('active') || lowerStatus === 'yes') {
    return 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500'
  }
  if (lowerStatus.includes('inactive') || lowerStatus === 'no') {
    return 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80'
  }
  if (lowerStatus.includes('pending')) {
    return 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400'
  }
  if (lowerStatus.includes('completed')) {
    return 'bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/15 dark:text-blue-light-500'
  }
  return 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80'
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
          <div
            v-for="(row, index) in table.getRowModel().rows"
          :key="row.id"
          class="rounded-2xl p-4 cursor-pointer transition-all border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-900/30 backdrop-blur-sm hover:bg-brand-50 dark:hover:bg-brand-500/20"
          @click="handleRowClick(row.original)"
        >
          <div class="flex items-start justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700/50">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  ID: {{ getId(row.original) }}
                </span>
              </div>
              <h4 class="text-base font-semibold text-gray-800 dark:text-gray-200">
                {{ getPrimaryFieldValue(row) }}
              </h4>
            </div>
            <span
              v-if="getStatusField(row)"
              class="rounded-full px-2.5 py-0.5 text-theme-xs font-medium capitalize flex-shrink-0"
              :class="getStatusClass(getStatusField(row))"
            >
              {{ getStatusField(row) }}
            </span>
          </div>

          <div class="space-y-2.5 mb-3">
            <div
              v-for="cell in getVisibleCellsForCard(row)"
              :key="cell.id"
              class="flex items-center justify-between text-sm"
            >
              <span class="text-gray-500 dark:text-gray-400">{{ getColumnLabel(cell.column.id) }}</span>
              <span class="text-gray-800 dark:text-gray-200 font-medium text-right flex-1 ml-4 truncate" :title="String(cell.getValue())">
                <component
                  v-if="typeof cell.column.columnDef.cell === 'function'"
                  :is="cell.column.columnDef.cell"
                  v-bind="cell.getContext()"
                />
                <span v-else>{{ cell.getValue() }}</span>
              </span>
            </div>
          </div>

          <div
            v-if="getCreatedAtValue(row) || getUpdatedAtValue(row)"
            class="flex items-center gap-4 pt-3 border-t border-gray-200 dark:border-gray-700/50 text-xs text-gray-500 dark:text-gray-400"
          >
            <span v-if="getCreatedAtValue(row)">
              Created: {{ formatDateTime(getCreatedAtValue(row)) }}
            </span>
            <span v-if="getCreatedAtValue(row) && getUpdatedAtValue(row)">•</span>
            <span v-if="getUpdatedAtValue(row)">
              Updated: {{ formatDateTime(getUpdatedAtValue(row)) }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="!loading && props.data.length === 0" class="py-8 text-center">
        <CommonEmptyState
          title="No data available"
          description="There are no records to display"
          icon="lucide:database"
          size="sm"
        />
      </div>
      <div v-if="loading" class="lg:hidden space-y-3">
        <div
          v-for="i in (props.skeletonRows || 5)"
          :key="`mobile-skeleton-${i}`"
          class="rounded-2xl p-4 border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-900/30 animate-pulse"
        >
          <div class="flex items-start justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700/50">
            <div class="flex-1 space-y-2">
              <div class="h-3 skeleton-base rounded w-16"></div>
              <div class="h-5 skeleton-base rounded w-3/4"></div>
            </div>
            <div class="h-6 skeleton-base rounded w-20"></div>
          </div>
          <div class="space-y-2.5">
            <div v-for="j in 3" :key="j" class="flex items-center justify-between">
              <div class="h-3 skeleton-base rounded w-24"></div>
              <div class="h-3 skeleton-base rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      class="hidden lg:block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
    >
      <div class="max-w-full overflow-x-auto custom-scrollbar">
        <table class="min-w-full" aria-label="Data table">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
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
                    'cursor-pointer select-none hover:bg-brand-50 dark:hover:bg-brand-500/20 transition-colors',
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
                    class="font-medium text-gray-500 text-theme-xs dark:text-gray-400 truncate min-w-0 flex-1"
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
                    class="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0"
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
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
                  <div class="h-4 skeleton-base rounded" :style="{ width: headerIndex % 3 === 0 ? '80%' : headerIndex % 3 === 1 ? '60%' : '90%' }"></div>
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
                    'group cursor-pointer transition-all duration-200 border-t border-gray-100 dark:border-gray-800',
                    selectedRows.some((selectedRow: any) => getId(selectedRow) === getId(row.original))
                      ? 'bg-brand-50 dark:bg-brand-500/10'
                      : 'hover:bg-brand-50 dark:hover:bg-brand-500/20',
                  ]"
                  @click="handleRowClick(row.original)"
                >
                  <td
                    v-for="cell in row.getVisibleCells()"
                    :key="cell.id"
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
                  class="text-gray-500 text-theme-sm dark:text-gray-400 w-full truncate"
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
                  'group cursor-pointer transition-all duration-200 border-t border-gray-100 dark:border-gray-800',
                  selectedRows.some((selectedRow: any) => getId(selectedRow) === getId(row.original))
                    ? 'bg-brand-50 dark:bg-brand-500/10'
                    : 'hover:bg-brand-50 dark:hover:bg-brand-500/20',
                ]"
                @click="handleRowClick(row.original)"
              >
                <td
                  v-for="cell in row.getVisibleCells()"
                  :key="cell.id"
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
                    class="text-gray-500 text-theme-sm dark:text-gray-400 w-full truncate"
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
