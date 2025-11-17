<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import {
  useVueTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/vue-table";
import type { DataTableProps } from "../../utils/types";

const props = withDefaults(defineProps<DataTableProps>(), {
  pageSize: 10,
  loading: false,
  selectable: false,
  contextMenuItems: undefined,
  selectedItems: () => [],
});

const emit = defineEmits<{
  "row-click": [row: any];
  "selection-change": [selectedRows: any[]];
}>();

const { getId } = useDatabase();

function handleRowClick(row: any) {
  emit("row-click", row);
}

const sorting = ref<SortingState>([]);
const columnVisibility = ref<VisibilityState>({});
const rowSelection = ref({});


// Enhanced columns with checkbox if selectable
const enhancedColumns = computed(() => {
  if (!props.selectable) return props.columns;

  const selectColumn: ColumnDef<any> = {
    id: "select",
    header: ({ table }) =>
      h("input", {
        type: "checkbox",
        class: "rounded w-5 h-5 cursor-pointer block mx-auto",
        checked: table.getIsAllRowsSelected(),
        indeterminate: table.getIsSomeRowsSelected(),
        onChange: table.getToggleAllRowsSelectedHandler(),
        onClick: (e: Event) => e.stopPropagation(),
        "aria-label": "Select all rows",
      }),
    cell: ({ row }) =>
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

// Create table instance
const table = useVueTable({
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
  onSortingChange: (updater) => {
    sorting.value =
      typeof updater === "function" ? updater(sorting.value) : updater;
  },
  onColumnVisibilityChange: (updater) => {
    columnVisibility.value =
      typeof updater === "function" ? updater(columnVisibility.value) : updater;
  },
  onRowSelectionChange: (updater) => {
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
});

const selectedRows = computed(() => {
  return table.getSelectedRowModel().rows.map((row) => row.original);
});

// Sync external selectedItems with internal rowSelection
watch(
  () => props.selectedItems,
  (newSelectedItems) => {
    if (!newSelectedItems) return;
    
    // Build row selection map based on current data indices
    const newRowSelection: Record<string, boolean> = {};
    newSelectedItems.forEach(id => {
      const rowIndex = props.data.findIndex(row => row.id === id);
      if (rowIndex >= 0) {
        newRowSelection[rowIndex] = true;
      }
    });
    
    // Only update if different to avoid unnecessary re-renders
    const currentKeys = Object.keys(rowSelection.value);
    const newKeys = Object.keys(newRowSelection);
    
    if (currentKeys.length !== newKeys.length || 
        !newKeys.every(key => (rowSelection.value as Record<string, boolean>)[key])) {
      rowSelection.value = newRowSelection;
    }
  },
  { immediate: true }
);

// Emit selection changes to parent (with debounce to prevent rapid firing)
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

// Helper functions for card view
function getPrimaryFieldValue(row: any) {
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
    return 'bg-green-500/15 border border-green-500/30 text-green-400'
  }
  if (lowerStatus.includes('inactive') || lowerStatus === 'no') {
    return 'bg-gray-500/15 border border-gray-500/30 text-gray-400'
  }
  if (lowerStatus.includes('pending')) {
    return 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-400'
  }
  if (lowerStatus.includes('completed')) {
    return 'bg-blue-500/15 border border-blue-500/30 text-blue-400'
  }
  return 'bg-gray-500/15 border border-gray-500/30 text-gray-400'
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
  const header = table.getFlatHeaders().find((h: any) => h.id === columnId)
  if (header && typeof header.column.columnDef.header === 'string') {
    return header.column.columnDef.header
  }
  return columnId.charAt(0).toUpperCase() + columnId.slice(1).replace(/([A-Z])/g, ' $1')
}
</script>

<template>
  <div class="w-full space-y-4">
    <!-- Loading State -->
    <div v-if="loading" class="w-full">
      <CommonLoadingState type="table" size="md" context="page" />
    </div>

    <!-- Mobile & Tablet Card View -->
    <div v-if="!loading" class="lg:hidden">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="(row, index) in table.getRowModel().rows"
          :key="row.id"
          class="rounded-2xl p-4 cursor-pointer transition-all border border-gray-700/50 bg-gray-900/30 backdrop-blur-sm hover:bg-gray-800/40"
          @click="handleRowClick(row.original)"
        >
          <div class="flex items-start justify-between mb-3 pb-3 border-b border-gray-700/50">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs text-gray-500">
                  ID: {{ getId(row.original) }}
                </span>
              </div>
              <h4 class="text-base font-semibold text-gray-200">
                {{ getPrimaryFieldValue(row) }}
              </h4>
            </div>
            <div
              v-if="getStatusField(row)"
              class="px-2.5 py-1 rounded-full text-xs flex-shrink-0"
              :class="getStatusClass(getStatusField(row))"
            >
              {{ getStatusField(row) }}
            </div>
          </div>

          <div class="space-y-2.5 mb-3">
            <div
              v-for="cell in getVisibleCellsForCard(row)"
              :key="cell.id"
              class="flex items-center justify-between text-sm"
            >
              <span class="text-gray-400">{{ getColumnLabel(cell.column.id) }}</span>
              <span class="text-gray-200 font-medium text-right flex-1 ml-4 truncate" :title="String(cell.getValue())">
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
            class="flex items-center gap-4 pt-3 border-t border-gray-700/50 text-xs text-gray-500"
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
    </div>

    <!-- Desktop Table View -->
    <div
      v-if="!loading"
      class="hidden lg:block overflow-hidden rounded-2xl border border-gray-700/50 transition-all duration-300 bg-gray-900/30 backdrop-blur-sm"
    >
      <div class="overflow-x-auto">
        <table class="w-full table-fixed" aria-label="Data table">
          <thead class="bg-gray-800/50 border-b border-gray-700/50">
            <tr>
              <th
                v-for="header in table.getFlatHeaders()"
                :key="header.id"
                :class="[
                  'px-4 py-3.5 text-sm font-medium text-gray-400',
                  header.id === '__actions' ? 'text-center' : 'text-left',
                  header.id === 'select' ? 'w-12 min-w-12 max-w-12' : '',
                  header.id === '__actions' ? 'w-12 min-w-12 max-w-12' : '',
                  header.id?.toLowerCase() === 'id' ? 'w-20 min-w-20 max-w-20' : '',
                  header.column.getCanSort() &&
                    'cursor-pointer select-none lg:hover:bg-gray-800 transition-colors',
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
                    'flex items-center gap-2',
                    header.id === '__actions' ? 'justify-center' : '',
                  ]"
                >
                  <span v-if="typeof header.column.columnDef.header === 'string'">
                    {{ header.column.columnDef.header }}
                  </span>
                  <component
                    v-else
                    :is="header.column.columnDef.header"
                    v-bind="header.getContext()"
                  />
                  <UIcon
                    v-if="header.column.getCanSort()"
                    :name="
                      header.column.getIsSorted() === 'asc'
                        ? 'i-lucide-chevron-up'
                        : header.column.getIsSorted() === 'desc'
                        ? 'i-lucide-chevron-down'
                        : 'i-lucide-chevrons-up-down'
                    "
                    class="w-4 h-4 text-gray-500"
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800/30">
            <template v-for="(row, index) in table.getRowModel().rows" :key="row.id">
              <!-- With Context Menu -->
              <UContextMenu
                v-if="props.contextMenuItems"
                :items="props.contextMenuItems(row.original)"
                :disabled="props.contextMenuItems(row.original).length === 0"
              >
                <tr
                  :class="[
                    'group cursor-pointer transition-all duration-200',
                    selectedRows.some((selectedRow: any) => getId(selectedRow) === getId(row.original))
                      ? 'bg-gray-800/60'
                      : 'lg:hover:bg-gray-800/30',
                  ]"
                  @click="handleRowClick(row.original)"
                >
                  <td
                    v-for="cell in row.getVisibleCells()"
                    :key="cell.id"
                :class="[
                  'px-4 py-3.5 text-sm text-gray-200 align-middle',
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
                    <div
                  v-if="typeof cell.column.columnDef.cell !== 'function'"
                  class="w-full truncate"
                      :title="String(cell.getValue())"
                    >
                      {{ cell.getValue() }}
                    </div>
                    <component
                      v-else
                      :is="cell.column.columnDef.cell"
                      v-bind="cell.getContext()"
                    />
                  </td>
                </tr>
              </UContextMenu>

              <!-- Without Context Menu -->
              <tr
                v-else
                :class="[
                  'group cursor-pointer transition-all duration-200',
                  selectedRows.some((selectedRow: any) => getId(selectedRow) === getId(row.original))
                    ? 'bg-gray-800/60'
                    : 'lg:hover:bg-gray-800/30',
                ]"
                @click="handleRowClick(row.original)"
              >
                <td
                  v-for="cell in row.getVisibleCells()"
                  :key="cell.id"
                  :class="[
                    'px-4 py-3.5 text-sm text-gray-200 align-middle',
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
                  <div
                    v-if="typeof cell.column.columnDef.cell !== 'function'"
                    class="w-full truncate"
                    :title="String(cell.getValue())"
                  >
                    {{ cell.getValue() }}
                  </div>
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
                :colspan="table.getFlatHeaders().length"
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
  </div>
</template>
