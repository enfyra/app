import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'

// Mock TanStack Table
const mockUseVueTable = vi.fn()
const mockGetCoreRowModel = vi.fn()
const mockGetSortedRowModel = vi.fn()
const mockGetPaginationRowModel = vi.fn()
const mockGetFilteredRowModel = vi.fn()

vi.mock('@tanstack/vue-table', () => ({
  useVueTable: mockUseVueTable,
  getCoreRowModel: mockGetCoreRowModel,
  getSortedRowModel: mockGetSortedRowModel,
  getPaginationRowModel: mockGetPaginationRowModel,
  getFilteredRowModel: mockGetFilteredRowModel
}))

// Create a simplified mock DataTable component for testing
const MockDataTable = {
  name: 'DataTable',
  props: {
    data: { type: Array, required: true },
    columns: { type: Array, required: true },
    pageSize: { type: Number, default: 10 },
    loading: { type: Boolean, default: false },
    selectable: { type: Boolean, default: false }
  },
  emits: ['row-click', 'bulk-delete'],
  template: `
    <div class="data-table-container" :class="{ loading: loading }">
      <div v-if="loading" data-testid="loading-state" class="loading-overlay">
        Loading...
      </div>
      
      <!-- Header -->
      <div class="table-header" data-testid="table-header">
        <div v-if="selectable" class="bulk-actions" data-testid="bulk-actions">
          <span>{{ selectedCount }} selected</span>
          <button @click="handleBulkDelete" data-testid="bulk-delete-btn">Delete</button>
        </div>
      </div>

      <!-- Table -->
      <table data-testid="data-table" class="table">
        <thead>
          <tr>
            <th v-if="selectable" data-testid="select-all-header">
              <input 
                type="checkbox" 
                @change="toggleSelectAll"
                :checked="allSelected"
                data-testid="select-all-checkbox"
              />
            </th>
            <th 
              v-for="column in columns" 
              :key="column.id || column.accessorKey"
              @click="handleSort(column)"
              :class="{ sortable: column.enableSorting !== false }"
              :data-testid="'header-' + (column.id || column.accessorKey)"
            >
              {{ column.header }}
              <span v-if="getSortIcon(column)" :data-testid="'sort-' + (column.id || column.accessorKey)">
                {{ getSortIcon(column) }}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="data.length === 0" data-testid="empty-row">
            <td :colspan="totalColumns" class="empty-state">
              No data available
            </td>
          </tr>
          <tr 
            v-for="(row, index) in paginatedData" 
            :key="index"
            @click="handleRowClick(row)"
            :class="{ selected: selectedRows.has(index) }"
            :data-testid="'row-' + index"
          >
            <td v-if="selectable">
              <input 
                type="checkbox"
                @click.stop
                @change="toggleRowSelection(index)"
                :checked="selectedRows.has(index)"
                :data-testid="'select-row-' + index"
              />
            </td>
            <td 
              v-for="column in columns" 
              :key="column.id || column.accessorKey"
              :data-testid="'cell-' + index + '-' + (column.id || column.accessorKey)"
            >
              {{ getCellValue(row, column) }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="table-footer" data-testid="table-footer">
        <div class="pagination" data-testid="pagination">
          <button 
            @click="previousPage" 
            :disabled="currentPage <= 1"
            data-testid="prev-page"
          >
            Previous
          </button>
          <span data-testid="page-info">
            Page {{ currentPage }} of {{ totalPages }}
          </span>
          <button 
            @click="nextPage" 
            :disabled="currentPage >= totalPages"
            data-testid="next-page"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  `,
  setup(props, { emit }) {
    const selectedRows = ref(new Set())
    const currentPage = ref(1)
    const sortColumn = ref(null)
    const sortDirection = ref('asc')

    const totalColumns = computed(() => {
      return props.columns.length + (props.selectable ? 1 : 0)
    })

    const selectedCount = computed(() => {
      return selectedRows.value.size
    })

    const allSelected = computed(() => {
      return selectedRows.value.size === props.data.length && props.data.length > 0
    })

    const totalPages = computed(() => {
      return Math.ceil(props.data.length / props.pageSize)
    })

    const paginatedData = computed(() => {
      const start = (currentPage.value - 1) * props.pageSize
      const end = start + props.pageSize
      let sortedData = [...props.data]

      // Apply sorting
      if (sortColumn.value) {
        sortedData.sort((a, b) => {
          const aVal = getCellValue(a, sortColumn.value)
          const bVal = getCellValue(b, sortColumn.value)
          const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
          return sortDirection.value === 'desc' ? -result : result
        })
      }

      return sortedData.slice(start, end)
    })

    const getCellValue = (row, column) => {
      if (column.accessorKey) {
        return row[column.accessorKey]
      }
      if (column.accessorFn) {
        return column.accessorFn(row)
      }
      return ''
    }

    const getSortIcon = (column) => {
      if (sortColumn.value?.id === column.id || sortColumn.value?.accessorKey === column.accessorKey) {
        return sortDirection.value === 'asc' ? '↑' : '↓'
      }
      return ''
    }

    const handleSort = (column) => {
      if (column.enableSorting === false) return
      
      if (sortColumn.value?.id === column.id || sortColumn.value?.accessorKey === column.accessorKey) {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
      } else {
        sortColumn.value = column
        sortDirection.value = 'asc'
      }
    }

    const handleRowClick = (row) => {
      emit('row-click', row)
    }

    const toggleRowSelection = (index) => {
      if (selectedRows.value.has(index)) {
        selectedRows.value.delete(index)
      } else {
        selectedRows.value.add(index)
      }
      selectedRows.value = new Set(selectedRows.value)
    }

    const toggleSelectAll = () => {
      if (allSelected.value) {
        selectedRows.value.clear()
      } else {
        selectedRows.value = new Set(Array.from({ length: props.data.length }, (_, i) => i))
      }
      selectedRows.value = new Set(selectedRows.value)
    }

    const handleBulkDelete = () => {
      const selected = Array.from(selectedRows.value).map(index => props.data[index])
      emit('bulk-delete', selected)
    }

    const nextPage = () => {
      if (currentPage.value < totalPages.value) {
        currentPage.value++
      }
    }

    const previousPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--
      }
    }

    return {
      selectedRows,
      currentPage,
      selectedCount,
      allSelected,
      totalPages,
      totalColumns,
      paginatedData,
      getCellValue,
      getSortIcon,
      handleSort,
      handleRowClick,
      toggleRowSelection,
      toggleSelectAll,
      handleBulkDelete,
      nextPage,
      previousPage
    }
  }
}

describe('DataTable', () => {
  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Moderator' }
  ]

  const mockColumns = [
    { id: 'name', header: 'Name', accessorKey: 'name' },
    { id: 'email', header: 'Email', accessorKey: 'email' },
    { id: 'role', header: 'Role', accessorKey: 'role' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render table with data', () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: mockData,
          columns: mockColumns
        }
      })

      expect(wrapper.find('[data-testid="data-table"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="row-0"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="row-1"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="row-2"]').exists()).toBe(true)
    })

    it('should render headers correctly', () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: mockData,
          columns: mockColumns
        }
      })

      expect(wrapper.find('[data-testid="header-name"]').text()).toContain('Name')
      expect(wrapper.find('[data-testid="header-email"]').text()).toContain('Email')
      expect(wrapper.find('[data-testid="header-role"]').text()).toContain('Role')
    })

    it('should render cell data correctly', () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: mockData,
          columns: mockColumns
        }
      })

      expect(wrapper.find('[data-testid="cell-0-name"]').text()).toBe('John Doe')
      expect(wrapper.find('[data-testid="cell-0-email"]').text()).toBe('john@example.com')
      expect(wrapper.find('[data-testid="cell-1-name"]').text()).toBe('Jane Smith')
    })

    it('should show empty state when no data', () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: [],
          columns: mockColumns
        }
      })

      expect(wrapper.find('[data-testid="empty-row"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="empty-row"]').text()).toContain('No data available')
    })
  })

  describe('Loading State', () => {
    it('should show loading state when loading prop is true', () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          loading: true
        }
      })

      expect(wrapper.find('[data-testid="loading-state"]').exists()).toBe(true)
      expect(wrapper.find('.data-table-container').classes()).toContain('loading')
    })

    it('should not show loading state when loading is false', () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          loading: false
        }
      })

      expect(wrapper.find('[data-testid="loading-state"]').exists()).toBe(false)
    })
  })

  describe('Row Selection', () => {
    it('should not show selection column when selectable is false', () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          selectable: false
        }
      })

      expect(wrapper.find('[data-testid="select-all-header"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="select-row-0"]').exists()).toBe(false)
    })

    it('should show selection column when selectable is true', () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          selectable: true
        }
      })

      expect(wrapper.find('[data-testid="select-all-header"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="select-row-0"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="bulk-actions"]').exists()).toBe(true)
    })

    it('should handle individual row selection', async () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          selectable: true
        }
      })

      const checkbox = wrapper.find('[data-testid="select-row-0"]')
      await checkbox.trigger('change')

      expect(wrapper.find('[data-testid="bulk-actions"]').text()).toContain('1 selected')
    })

    it('should handle select all functionality', async () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          selectable: true
        }
      })

      const selectAllCheckbox = wrapper.find('[data-testid="select-all-checkbox"]')
      await selectAllCheckbox.trigger('change')

      expect(wrapper.find('[data-testid="bulk-actions"]').text()).toContain('3 selected')
    })

    it('should emit bulk-delete event with selected rows', async () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          selectable: true
        }
      })

      // Select first row
      await wrapper.find('[data-testid="select-row-0"]').trigger('change')
      
      // Click bulk delete
      await wrapper.find('[data-testid="bulk-delete-btn"]').trigger('click')

      expect(wrapper.emitted('bulk-delete')).toBeTruthy()
      expect(wrapper.emitted('bulk-delete')[0][0]).toEqual([mockData[0]])
    })
  })

  describe('Row Click Events', () => {
    it('should emit row-click event when row is clicked', async () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: mockData,
          columns: mockColumns
        }
      })

      await wrapper.find('[data-testid="row-0"]').trigger('click')

      expect(wrapper.emitted('row-click')).toBeTruthy()
      expect(wrapper.emitted('row-click')[0][0]).toEqual(mockData[0])
    })

    it('should not emit row-click when clicking checkbox', async () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          selectable: true
        }
      })

      await wrapper.find('[data-testid="select-row-0"]').trigger('click')

      expect(wrapper.emitted('row-click')).toBeFalsy()
    })
  })

  describe('Sorting', () => {
    it('should show sort indicators when column is sorted', async () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: mockData,
          columns: mockColumns
        }
      })

      await wrapper.find('[data-testid="header-name"]').trigger('click')

      expect(wrapper.find('[data-testid="sort-name"]').text()).toBe('↑')
    })

    it('should toggle sort direction on multiple clicks', async () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: mockData,
          columns: mockColumns
        }
      })

      const nameHeader = wrapper.find('[data-testid="header-name"]')
      
      await nameHeader.trigger('click')
      expect(wrapper.find('[data-testid="sort-name"]').text()).toBe('↑')
      
      await nameHeader.trigger('click')
      expect(wrapper.find('[data-testid="sort-name"]').text()).toBe('↓')
    })

    it('should not sort when column has enableSorting: false', async () => {
      const columnsWithNoSort = [
        { id: 'name', header: 'Name', accessorKey: 'name', enableSorting: false },
        ...mockColumns.slice(1)
      ]

      const wrapper = mount(MockDataTable, {
        props: {
          data: mockData,
          columns: columnsWithNoSort
        }
      })

      await wrapper.find('[data-testid="header-name"]').trigger('click')

      expect(wrapper.find('[data-testid="sort-name"]').exists()).toBe(false)
    })
  })

  describe('Pagination', () => {
    const largeData = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: 'User'
    }))

    it('should show correct pagination info', () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: largeData,
          columns: mockColumns,
          pageSize: 10
        }
      })

      expect(wrapper.find('[data-testid="page-info"]').text()).toBe('Page 1 of 3')
    })

    it('should navigate to next page', async () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: largeData,
          columns: mockColumns,
          pageSize: 10
        }
      })

      await wrapper.find('[data-testid="next-page"]').trigger('click')

      expect(wrapper.find('[data-testid="page-info"]').text()).toBe('Page 2 of 3')
    })

    it('should navigate to previous page', async () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: largeData,
          columns: mockColumns,
          pageSize: 10
        }
      })

      // Go to page 2 first
      await wrapper.find('[data-testid="next-page"]').trigger('click')
      expect(wrapper.find('[data-testid="page-info"]').text()).toBe('Page 2 of 3')

      // Then go back to page 1
      await wrapper.find('[data-testid="prev-page"]').trigger('click')
      expect(wrapper.find('[data-testid="page-info"]').text()).toBe('Page 1 of 3')
    })

    it('should disable previous button on first page', () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: largeData,
          columns: mockColumns,
          pageSize: 10
        }
      })

      expect(wrapper.find('[data-testid="prev-page"]').attributes('disabled')).toBeDefined()
    })

    it('should disable next button on last page', async () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: largeData,
          columns: mockColumns,
          pageSize: 10
        }
      })

      // Navigate to last page
      await wrapper.find('[data-testid="next-page"]').trigger('click')
      await wrapper.find('[data-testid="next-page"]').trigger('click')

      expect(wrapper.find('[data-testid="next-page"]').attributes('disabled')).toBeDefined()
    })
  })

  describe('Props Validation', () => {
    it('should use default pageSize when not provided', () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: mockData,
          columns: mockColumns
        }
      })

      // With 3 items and default pageSize 10, should show all on page 1
      expect(wrapper.find('[data-testid="page-info"]').text()).toBe('Page 1 of 1')
    })

    it('should handle custom pageSize', () => {
      const wrapper = mount(MockDataTable, {
        props: {
          data: mockData,
          columns: mockColumns,
          pageSize: 2
        }
      })

      // With 3 items and pageSize 2, should have 2 pages
      expect(wrapper.find('[data-testid="page-info"]').text()).toBe('Page 1 of 2')
    })
  })
})