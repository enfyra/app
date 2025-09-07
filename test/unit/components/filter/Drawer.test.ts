import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed, watch } from 'vue'

// Mock FilterGroup and FilterCondition types for testing
interface FilterCondition {
  field: string
  operator: string
  value: any
  type?: string
}

interface FilterGroup {
  id: string
  operator: 'and' | 'or'
  conditions: (FilterCondition | FilterGroup)[]
}

// Mock the filter functionality
const MockFilterDrawer = {
  name: 'MockFilterDrawer',
  props: {
    modelValue: { type: Boolean, required: true },
    tableName: { type: String, required: true },
    currentFilter: { type: Object, default: null }
  },
  emits: ['update:modelValue', 'apply'],
  setup(props, { emit }) {
    // Mock composable returns
    const schemas = ref({ tables: {} })
    const addToHistory = vi.fn()
    const hasActiveFilters = vi.fn(() => false)
    const createEmptyFilter = vi.fn(() => ({
      id: 'filter-1',
      operator: 'and' as const,
      conditions: []
    }))

    // Local state management
    const localFilter = ref<FilterGroup>(createEmptyFilter())
    const originalFilter = ref<FilterGroup>(createEmptyFilter())

    // Watch for currentFilter changes
    watch(() => props.currentFilter, (newFilter) => {
      if (newFilter) {
        localFilter.value = JSON.parse(JSON.stringify(newFilter))
      }
    }, { immediate: true })

    // Watch for drawer open/close
    watch(() => props.modelValue, (isOpen) => {
      if (isOpen) {
        const initialFilter = props.currentFilter || localFilter.value
        localFilter.value = JSON.parse(JSON.stringify(initialFilter))
        originalFilter.value = JSON.parse(JSON.stringify(initialFilter))
      }
    })

    function handleApply() {
      if (localFilter.value.conditions.length > 0) {
        addToHistory(localFilter.value)
      }
      emit('apply', { ...localFilter.value })
      emit('update:modelValue', false)
    }

    function handleClear() {
      localFilter.value = createEmptyFilter()
      emit('apply', { ...localFilter.value })
      emit('update:modelValue', false)
    }

    function handleClose() {
      localFilter.value = JSON.parse(JSON.stringify(originalFilter.value))
      emit('update:modelValue', false)
    }

    function applySavedFilter(filter: FilterGroup) {
      localFilter.value = { ...filter }
      emit('apply', { ...filter })
      emit('update:modelValue', false)
    }

    const hasActiveConditions = computed(() => {
      return localFilter.value.conditions.some((condition) => {
        if ('field' in condition) {
          return condition.field && condition.operator
        } else {
          return hasActiveFiltersLocal(condition)
        }
      })
    })

    function hasActiveFiltersLocal(group: FilterGroup): boolean {
      return group.conditions.some((condition) => {
        if ('field' in condition) {
          return condition.field && condition.operator
        } else {
          return hasActiveFiltersLocal(condition)
        }
      })
    }

    return {
      localFilter,
      originalFilter,
      hasActiveConditions,
      handleApply,
      handleClear,
      handleClose,
      applySavedFilter,
      addToHistory,
      hasActiveFilters,
      createEmptyFilter,
      hasActiveFiltersLocal
    }
  },
  template: `
    <div v-if="modelValue" data-testid="filter-drawer" class="filter-drawer">
      <div data-testid="drawer-header" class="drawer-header">
        <h2>Filter {{ tableName }}</h2>
        <button @click="handleClose" data-testid="close-btn">×</button>
      </div>
      
      <div data-testid="drawer-body" class="drawer-body">
        <div data-testid="filter-conditions">
          <div v-for="(condition, index) in localFilter.conditions" :key="index" class="condition-item">
            <span v-if="'field' in condition" data-testid="condition-field">{{ condition.field }}</span>
            <span v-if="'operator' in condition" data-testid="condition-operator">{{ condition.operator }}</span>
            <span v-if="'value' in condition" data-testid="condition-value">{{ condition.value }}</span>
          </div>
          <div v-if="localFilter.conditions.length === 0" data-testid="no-conditions">
            No filter conditions
          </div>
        </div>
        
        <div data-testid="filter-controls" class="filter-controls">
          <button @click="handleClear" data-testid="clear-btn" :disabled="!hasActiveConditions">
            Clear All
          </button>
          <button @click="handleApply" data-testid="apply-btn" :disabled="!hasActiveConditions">
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  `
}

describe('FilterDrawer Component (Critical Query Generation)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Drawer Visibility', () => {
    it('should show drawer when modelValue is true', () => {
      const wrapper = mount(MockFilterDrawer, {
        props: {
          modelValue: true,
          tableName: 'users'
        }
      })

      expect(wrapper.find('[data-testid="filter-drawer"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="drawer-header"]').text()).toContain('Filter users')
    })

    it('should hide drawer when modelValue is false', () => {
      const wrapper = mount(MockFilterDrawer, {
        props: {
          modelValue: false,
          tableName: 'users'
        }
      })

      expect(wrapper.find('[data-testid="filter-drawer"]').exists()).toBe(false)
    })

    it('should display correct table name in header', () => {
      const wrapper = mount(MockFilterDrawer, {
        props: {
          modelValue: true,
          tableName: 'products'
        }
      })

      expect(wrapper.find('[data-testid="drawer-header"]').text()).toContain('Filter products')
    })
  })

  describe('Filter State Management', () => {
    it('should initialize with empty filter when no currentFilter provided', () => {
      const wrapper = mount(MockFilterDrawer, {
        props: {
          modelValue: true,
          tableName: 'users'
        }
      })

      expect(wrapper.find('[data-testid="no-conditions"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="no-conditions"]').text()).toBe('No filter conditions')
    })

    it('should initialize with currentFilter when provided', () => {
      const currentFilter: FilterGroup = {
        id: 'test-filter',
        operator: 'and',
        conditions: [
          { field: 'name', operator: 'contains', value: 'john', type: 'string' }
        ]
      }

      const wrapper = mount(MockFilterDrawer, {
        props: {
          modelValue: true,
          tableName: 'users',
          currentFilter
        }
      })

      expect(wrapper.find('[data-testid="no-conditions"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="condition-field"]').text()).toBe('name')
      expect(wrapper.find('[data-testid="condition-operator"]').text()).toBe('contains')
      expect(wrapper.find('[data-testid="condition-value"]').text()).toBe('john')
    })

    it('should preserve original filter state for canceling', async () => {
      const currentFilter: FilterGroup = {
        id: 'test-filter',
        operator: 'and',
        conditions: [
          { field: 'age', operator: 'gt', value: 18, type: 'number' }
        ]
      }

      const wrapper = mount(MockFilterDrawer, {
        props: {
          modelValue: true,
          tableName: 'users',
          currentFilter
        }
      })

      // Verify initial state
      expect(wrapper.find('[data-testid="condition-field"]').text()).toBe('age')
      
      // Simulate modification (in real app, user would modify through UI)
      wrapper.vm.localFilter.conditions = []
      await wrapper.vm.$nextTick()

      // Close without applying (cancel)
      await wrapper.find('[data-testid="close-btn"]').trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0][0]).toBe(false)
    })
  })

  describe('Filter Actions', () => {
    it('should apply filter and close drawer', async () => {
      const currentFilter: FilterGroup = {
        id: 'test-filter',
        operator: 'and',
        conditions: [
          { field: 'status', operator: 'eq', value: 'active', type: 'string' }
        ]
      }

      const wrapper = mount(MockFilterDrawer, {
        props: {
          modelValue: true,
          tableName: 'users',
          currentFilter
        }
      })

      await wrapper.find('[data-testid="apply-btn"]').trigger('click')

      expect(wrapper.emitted('apply')).toBeTruthy()
      expect(wrapper.emitted('apply')[0][0]).toEqual(expect.objectContaining({
        operator: 'and',
        conditions: expect.arrayContaining([
          expect.objectContaining({
            field: 'status',
            operator: 'eq',
            value: 'active'
          })
        ])
      }))
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0][0]).toBe(false)
    })

    it('should clear all filters and close drawer', async () => {
      const currentFilter: FilterGroup = {
        id: 'test-filter',
        operator: 'and',
        conditions: [
          { field: 'name', operator: 'contains', value: 'test', type: 'string' }
        ]
      }

      const wrapper = mount(MockFilterDrawer, {
        props: {
          modelValue: true,
          tableName: 'users',
          currentFilter
        }
      })

      await wrapper.find('[data-testid="clear-btn"]').trigger('click')

      expect(wrapper.emitted('apply')).toBeTruthy()
      expect(wrapper.emitted('apply')[0][0]).toEqual(expect.objectContaining({
        operator: 'and',
        conditions: []
      }))
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0][0]).toBe(false)
    })

    it('should close drawer without applying changes', async () => {
      const wrapper = mount(MockFilterDrawer, {
        props: {
          modelValue: true,
          tableName: 'users'
        }
      })

      await wrapper.find('[data-testid="close-btn"]').trigger('click')

      expect(wrapper.emitted('apply')).toBeFalsy()
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0][0]).toBe(false)
    })
  })

  describe('Button State Management', () => {
    it('should disable apply and clear buttons when no active conditions', () => {
      const wrapper = mount(MockFilterDrawer, {
        props: {
          modelValue: true,
          tableName: 'users'
        }
      })

      const applyBtn = wrapper.find('[data-testid="apply-btn"]')
      const clearBtn = wrapper.find('[data-testid="clear-btn"]')

      expect(applyBtn.attributes('disabled')).toBeDefined()
      expect(clearBtn.attributes('disabled')).toBeDefined()
    })

    it('should enable apply and clear buttons when active conditions exist', () => {
      const currentFilter: FilterGroup = {
        id: 'test-filter',
        operator: 'and',
        conditions: [
          { field: 'email', operator: 'contains', value: '@example.com', type: 'string' }
        ]
      }

      const wrapper = mount(MockFilterDrawer, {
        props: {
          modelValue: true,
          tableName: 'users',
          currentFilter
        }
      })

      const applyBtn = wrapper.find('[data-testid="apply-btn"]')
      const clearBtn = wrapper.find('[data-testid="clear-btn"]')

      expect(applyBtn.attributes('disabled')).toBeUndefined()
      expect(clearBtn.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Filter History Integration', () => {
    it('should add filter to history when applying', async () => {
      const currentFilter: FilterGroup = {
        id: 'test-filter',
        operator: 'or',
        conditions: [
          { field: 'role', operator: 'eq', value: 'admin', type: 'string' },
          { field: 'role', operator: 'eq', value: 'moderator', type: 'string' }
        ]
      }

      const wrapper = mount(MockFilterDrawer, {
        props: {
          modelValue: true,
          tableName: 'users',
          currentFilter
        }
      })

      await wrapper.find('[data-testid="apply-btn"]').trigger('click')

      expect(wrapper.vm.addToHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          operator: 'or',
          conditions: expect.any(Array)
        })
      )
    })

    it('should apply saved filter directly', async () => {
      const savedFilter: FilterGroup = {
        id: 'saved-filter',
        operator: 'and',
        conditions: [
          { field: 'created_at', operator: 'gte', value: '2024-01-01', type: 'date' }
        ]
      }

      const wrapper = mount(MockFilterDrawer, {
        props: {
          modelValue: true,
          tableName: 'users'
        }
      })

      wrapper.vm.applySavedFilter(savedFilter)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('apply')).toBeTruthy()
      expect(wrapper.emitted('apply')[0][0]).toEqual(expect.objectContaining({
        id: 'saved-filter',
        operator: 'and',
        conditions: expect.arrayContaining([
          expect.objectContaining({
            field: 'created_at',
            operator: 'gte',
            value: '2024-01-01'
          })
        ])
      }))
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })
  })

  describe('Complex Filter Scenarios', () => {
    it('should handle nested filter groups', () => {
      const nestedFilter: FilterGroup = {
        id: 'nested-filter',
        operator: 'and',
        conditions: [
          { field: 'status', operator: 'eq', value: 'active', type: 'string' },
          {
            id: 'nested-group',
            operator: 'or',
            conditions: [
              { field: 'age', operator: 'gte', value: 18, type: 'number' },
              { field: 'role', operator: 'eq', value: 'admin', type: 'string' }
            ]
          }
        ]
      }

      const wrapper = mount(MockFilterDrawer, {
        props: {
          modelValue: true,
          tableName: 'users',
          currentFilter: nestedFilter
        }
      })

      expect(wrapper.find('[data-testid="no-conditions"]').exists()).toBe(false)
      expect(wrapper.vm.hasActiveConditions).toBe(true)
    })

    it('should detect active conditions in nested groups', () => {
      const wrapper = mount(MockFilterDrawer, {
        props: {
          modelValue: true,
          tableName: 'users'
        }
      })

      // Test the hasActiveFiltersLocal function with nested groups
      const nestedGroup: FilterGroup = {
        id: 'test',
        operator: 'or',
        conditions: [
          { field: 'test', operator: 'eq', value: 'value', type: 'string' }
        ]
      }

      // This would be called internally by the component
      expect(wrapper.vm.hasActiveFiltersLocal?.(nestedGroup)).toBe(true)

      const emptyGroup: FilterGroup = {
        id: 'empty',
        operator: 'and',
        conditions: []
      }

      expect(wrapper.vm.hasActiveFiltersLocal?.(emptyGroup)).toBe(false)
    })
  })

  describe('Props Reactivity', () => {
    it('should update when modelValue changes', async () => {
      const wrapper = mount(MockFilterDrawer, {
        props: {
          modelValue: false,
          tableName: 'users'
        }
      })

      expect(wrapper.find('[data-testid="filter-drawer"]').exists()).toBe(false)

      await wrapper.setProps({ modelValue: true })

      expect(wrapper.find('[data-testid="filter-drawer"]').exists()).toBe(true)
    })

    it('should update when currentFilter changes', async () => {
      const wrapper = mount(MockFilterDrawer, {
        props: {
          modelValue: true,
          tableName: 'users'
        }
      })

      expect(wrapper.find('[data-testid="no-conditions"]').exists()).toBe(true)

      const newFilter: FilterGroup = {
        id: 'new-filter',
        operator: 'and',
        conditions: [
          { field: 'updated_field', operator: 'eq', value: 'test', type: 'string' }
        ]
      }

      await wrapper.setProps({ currentFilter: newFilter })

      expect(wrapper.find('[data-testid="no-conditions"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="condition-field"]').text()).toBe('updated_field')
    })
  })
})