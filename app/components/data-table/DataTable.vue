<script setup lang="ts">
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
</script>

<template>
  <div class="w-full space-y-4">
    <!-- Loading State -->
    <div v-if="loading" class="w-full">
      <CommonLoadingState type="table" size="md" context="page" />
    </div>

    <!-- Premium Table Container -->
    <div
      class="overflow-hidden rounded-2xl border border-gray-700/50 transition-all duration-300 bg-gray-900/30 backdrop-blur-sm"
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
                      'px-4 py-3.5 text-sm text-gray-200',
                      cell.column.id === 'select' ? 'w-12 min-w-12 max-w-12' : '',
                      cell.column.id === '__actions'
                        ? 'w-12 min-w-12 max-w-12'
                        : '',
                    ]"
                  >
                    <span v-if="typeof cell.column.columnDef.cell !== 'function'">
                      {{ cell.getValue() }}
                    </span>
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
                    'px-4 py-3.5 text-sm text-gray-200',
                    cell.column.id === 'select' ? 'w-12 min-w-12 max-w-12' : '',
                    cell.column.id === '__actions'
                      ? 'w-12 min-w-12 max-w-12'
                      : '',
                  ]"
                >
                  <span v-if="typeof cell.column.columnDef.cell !== 'function'">
                    {{ cell.getValue() }}
                  </span>
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
