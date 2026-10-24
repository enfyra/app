import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getColumnFields: vi.fn(),
  useAuthFetch: vi.fn(),
}))

mockNuxtImport('useDatabase', () => () => ({
  getId: (record: Record<string, unknown>) => record?.id ?? record?._id ?? null,
  getIdFieldName: () => 'id',
}))

mockNuxtImport('useFilterQuery', () => () => ({
  createEmptyFilter: () => ({}),
  buildQuery: (filter: { query?: Record<string, unknown> }) => filter.query ?? {},
  hasActiveFilters: (filter: { query?: Record<string, unknown> }) => !!filter.query,
  countActiveFilters: (filter: { query?: Record<string, unknown> }) => filter.query ? 1 : 0,
}))

mockNuxtImport('useMounted', () => () => ({ isMounted: ref(true) }))
mockNuxtImport('useSchema', () => () => ({
  definition: ref([]),
  getColumnFields: mocks.getColumnFields,
  ensureSchema: vi.fn().mockResolvedValue(undefined),
  generateEmptyForm: () => ({}),
  validate: () => ({ isValid: true, errors: {} }),
}))
mockNuxtImport('useApi', () => () => ({ data: ref(null), pending: ref(false), execute: vi.fn() }))
mockNuxtImport('useScreen', () => () => ({ isMobile: ref(false), isTablet: ref(false) }))
mockNuxtImport('useAuthFetch', () => mocks.useAuthFetch)

import RelationSelector from '~/components/form/relation/Selector.vue'

const DrawerStub = defineComponent({
  props: { modelValue: Boolean },
  template: '<div><slot name="body" /><slot name="footer" /></div>',
})

const DataTableStub = defineComponent({
  props: { loading: Boolean },
  template: '<div><div v-if="loading" data-testid="relation-loading" /><slot v-else name="empty" /></div>',
})

describe('FormRelationSelector', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    localStorage.removeItem('settings-page-size:relation-selector')
    mocks.getColumnFields.mockResolvedValue('id,name')
  })

  it('only offers existing records and filtering in the real relation drawer', async () => {
    mocks.useAuthFetch.mockResolvedValue({ data: [], meta: { filterCount: 0 } })
    const wrapper = await mountSuspended(RelationSelector, {
      props: {
        relationMeta: { propertyName: 'users', targetTableName: 'users', type: 'many-to-many' },
        selectedIds: [],
        open: false,
      },
      global: { stubs: {
        FormEditorLazy: defineComponent({ template: '<div data-testid="new-record-form" />' }),
        FilterDrawerLazy: true,
      } },
    })
    try {
      await wrapper.setProps({ open: true })
      await flushPromises()
      const buttons = [...document.body.querySelectorAll('button')]
      expect(buttons.some(button => button.textContent?.trim() === 'Filter')).toBe(true)
      expect(buttons.some(button => /Add New|Create Record/.test(button.textContent ?? ''))).toBe(false)
      expect(document.body.querySelector('[data-testid="new-record-form"]')).toBeNull()
      expect(document.body.textContent).toContain('0 records')
    } finally { wrapper.unmount() }
  })

  it('omits an unknown count and inactive empty action while preserving an explicit zero total', async () => {
    mocks.useAuthFetch.mockResolvedValue({ data: [], meta: { filterCount: 0 } })
    const TableProbe = defineComponent({
      props: ['paginationConfig'],
      template: '<div><slot name="empty" /></div>',
    })
    const EmptyProbe = defineComponent({
      props: ['action'],
      template: '<div />',
    })
    const wrapper = await mountSuspended(RelationSelector, {
      props: {
        relationMeta: { propertyName: 'users', targetTableName: 'users', type: 'many-to-many' },
        selectedIds: [],
        open: false,
      },
      global: { stubs: {
        CommonDrawer: DrawerStub,
        DataTable: TableProbe,
        CommonEmptyState: EmptyProbe,
        FilterDrawerLazy: true,
      } },
    })
    try {
      expect(wrapper.getComponent(TableProbe).props('paginationConfig')).not.toHaveProperty('total')
      expect(wrapper.getComponent(EmptyProbe).vm.$.vnode.props).not.toHaveProperty('action')
      await wrapper.setProps({ open: true })
      await flushPromises()
      expect(wrapper.getComponent(TableProbe).props('paginationConfig')).toHaveProperty('total', 0)
      expect(wrapper.getComponent(EmptyProbe).vm.$.vnode.props).not.toHaveProperty('action')
    } finally { wrapper.unmount() }
  })

  it('uses shared checkbox selection across cursor pages and applies ids only without quick search', async () => {
    mocks.useAuthFetch
      .mockResolvedValueOnce({ data: [{ id: 99 }] })
      .mockResolvedValueOnce({ data: Array.from({ length: 10 }, (_, index) => ({ id: 20 - index })), meta: { filterCount: 26 } })
      .mockResolvedValueOnce({ data: [{ id: 10 }] })
      .mockResolvedValue({ data: [] })
    const wrapper = await mountSuspended(RelationSelector, {
      props: {
        relationMeta: { propertyName: 'users', targetTableName: 'users', type: 'many-to-many' },
        selectedIds: [99],
        multiple: true,
        open: false,
      },
      global: { stubs: {
        CommonDrawer: DrawerStub,
        FilterDrawerLazy: true,
      } },
    })
    try {
      await wrapper.setProps({ open: true })
      await flushPromises()
      expect(wrapper.find('input').exists()).toBe(false)
      await wrapper.get('tbody [aria-label="Select row 2"]').trigger('click')
      await flushPromises()
      await wrapper.get('[aria-label="Next"]').trigger('click')
      await flushPromises()
      expect(mocks.useAuthFetch.mock.calls[0]?.[1].query).toMatchObject({ filter: { id: { _in: [99] } }, sort: '-id', limit: 1 })
      expect(mocks.useAuthFetch.mock.calls[1]?.[1].query).toMatchObject({ filter: { id: { _not_in: [99] } }, sort: '-id', limit: 10, meta: 'filterCount' })
      expect(mocks.useAuthFetch.mock.calls[2]?.[1].query).toMatchObject({
        filter: { _and: [{ id: { _not_in: [99] } }, { id: { _lt: 12 } }] },
        limit: 11,
      })
      expect(mocks.useAuthFetch.mock.calls[2]?.[1].query).not.toHaveProperty('meta')
      expect(wrapper.text()).toContain('27 records')
      const apply = wrapper.findAll('button').find(button => button.text() === 'Apply')!
      await apply.trigger('click')
      expect(new Set(wrapper.emitted('apply')?.at(-1)?.[0] as (string | number)[])).toEqual(new Set([99, 20]))
    } finally { wrapper.unmount() }
  })

  it('refreshes the filter total independently of the cursor boundary', async () => {
    mocks.useAuthFetch
      .mockResolvedValueOnce({ data: Array.from({ length: 11 }, (_, index) => ({ id: 20 - index })), meta: { filterCount: 27 } })
      .mockResolvedValueOnce({ data: [{ id: 10 }], meta: { filterCount: 1 } })
      .mockResolvedValueOnce({ data: [{ id: 8 }], meta: { filterCount: 1 } })
    const FilterStub = defineComponent({ emits: ['apply'], template: '<div />' })
    const wrapper = await mountSuspended(RelationSelector, {
      props: {
        relationMeta: { propertyName: 'users', targetTableName: 'users', type: 'many-to-many' },
        selectedIds: [],
        multiple: true,
        open: false,
      },
      global: { stubs: { CommonDrawer: DrawerStub, FilterDrawerLazy: FilterStub } },
    })
    try {
      await wrapper.setProps({ open: true })
      await flushPromises()
      expect(wrapper.text()).toContain('27 records')
      await wrapper.get('[aria-label="Next"]').trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('27 records')
      wrapper.getComponent(FilterStub).vm.$emit('apply', { query: { name: { _eq: 'Alice' } } })
      await flushPromises()
      expect(mocks.useAuthFetch.mock.calls[2]?.[1].query).toMatchObject({
        filter: { name: { _eq: 'Alice' } },
        meta: 'filterCount',
      })
      expect(wrapper.text()).toContain('1 records')
    } finally { wrapper.unmount() }
  })

  it('enables the rows-per-page selector and resets cursor pagination when page size changes while preserving draft selections', async () => {
    mocks.useAuthFetch
      .mockResolvedValueOnce({ data: [{ id: 99 }] })
      .mockResolvedValueOnce({ data: Array.from({ length: 10 }, (_, index) => ({ id: 30 - index })), meta: { filterCount: 39 } })
      .mockResolvedValueOnce({ data: Array.from({ length: 11 }, (_, index) => ({ id: 20 - index })) })
      .mockResolvedValueOnce({ data: [{ id: 99 }, { id: 30 }] })
      .mockResolvedValueOnce({ data: Array.from({ length: 19 }, (_, index) => ({ id: 29 - index })), meta: { filterCount: 38 } })
    const wrapper = await mountSuspended(RelationSelector, {
      props: {
        relationMeta: { propertyName: 'users', targetTableName: 'users', type: 'many-to-many' },
        selectedIds: [99],
        multiple: true,
        open: false,
      },
      global: { stubs: { CommonDrawer: DrawerStub, FilterDrawerLazy: true } },
    })
    try {
      await wrapper.setProps({ open: true })
      await flushPromises()
      expect(wrapper.find('[aria-label="Rows per page"]').exists()).toBe(true)
      await wrapper.get('tbody [aria-label="Select row 2"]').trigger('click')
      await flushPromises()
      await wrapper.get('[aria-label="Next"]').trigger('click')
      await flushPromises()
      expect(mocks.useAuthFetch.mock.calls[2]?.[1].query).toMatchObject({
        filter: { _and: [{ id: { _not_in: [99] } }, { id: { _lt: 22 } }] },
        limit: 11,
      })

      wrapper.getComponent({ name: 'DataTable' }).vm.$emit('page-size-change', 20)
      await flushPromises()

      expect(mocks.useAuthFetch.mock.calls[3]?.[1].query).toMatchObject({
        filter: { id: { _in: [99, 30] } },
        limit: 2,
      })
      expect(mocks.useAuthFetch.mock.calls[4]?.[1].query).toMatchObject({
        filter: { id: { _not_in: [99, 30] } },
        limit: 19,
        meta: 'filterCount',
      })
      expect(localStorage.getItem('settings-page-size:relation-selector')).toBe('20')
      const apply = wrapper.findAll('button').find(button => button.text() === 'Apply')!
      await apply.trigger('click')
      expect(new Set(wrapper.emitted('apply')?.at(-1)?.[0] as (string | number)[])).toEqual(new Set([99, 30]))
    } finally { wrapper.unmount() }
  })

  it('paginates selected records in _in slices first when selected count exceeds page size, then fills remaining slots with _not_in', async () => {
    const selectedIds = Array.from({ length: 12 }, (_, index) => 100 + index)
    mocks.useAuthFetch
      .mockResolvedValueOnce({ data: selectedIds.slice(0, 10).map(id => ({ id })) })
      .mockResolvedValueOnce({ data: selectedIds.slice(10, 12).map(id => ({ id })) })
      .mockResolvedValueOnce({ data: Array.from({ length: 9 }, (_, index) => ({ id: 50 - index })) })
      .mockResolvedValueOnce({ data: [{ id: 40 }] })
    const wrapper = await mountSuspended(RelationSelector, {
      props: {
        relationMeta: { propertyName: 'users', targetTableName: 'users', type: 'many-to-many' },
        selectedIds,
        multiple: true,
        open: false,
      },
      global: { stubs: { CommonDrawer: DrawerStub, FilterDrawerLazy: true } },
    })
    try {
      await wrapper.setProps({ open: true })
      await flushPromises()
      expect(mocks.useAuthFetch).toHaveBeenCalledTimes(1)
      expect(mocks.useAuthFetch.mock.calls[0]?.[1].query).toMatchObject({
        filter: { id: { _in: selectedIds.slice(0, 10) } },
        limit: 10,
      })

      await wrapper.get('[aria-label="Next"]').trigger('click')
      await flushPromises()
      expect(mocks.useAuthFetch).toHaveBeenCalledTimes(3)
      expect(mocks.useAuthFetch.mock.calls[1]?.[1].query).toMatchObject({
        filter: { id: { _in: [110, 111] } },
        limit: 2,
      })
      expect(mocks.useAuthFetch.mock.calls[2]?.[1].query).toMatchObject({
        filter: { id: { _not_in: selectedIds } },
        limit: 9,
      })

      await wrapper.get('[aria-label="Next"]').trigger('click')
      await flushPromises()
      expect(mocks.useAuthFetch).toHaveBeenCalledTimes(4)
      expect(mocks.useAuthFetch.mock.calls[3]?.[1].query).toMatchObject({
        filter: { _and: [{ id: { _not_in: selectedIds } }, { id: { _lt: 43 } }] },
        limit: 11,
      })
    } finally { wrapper.unmount() }
  })

  it('leaves loading and shows a retry state when relation records fail to load', async () => {
    mocks.useAuthFetch.mockRejectedValue(new Error('request failed'))

    const wrapper = await mountSuspended(RelationSelector, {
      props: {
        relationMeta: {
          propertyName: 'settings',
          targetTableName: 'ai_settings',
          type: 'many-to-one',
        },
        selectedIds: [],
        open: false,
      },
      global: {
        stubs: {
          CommonDrawer: DrawerStub,
          CommonEmptyState: defineComponent({
            props: { title: String, description: String },
            template: '<div data-testid="relation-empty">{{ title }} {{ description }}</div>',
          }),
          DataTable: DataTableStub,
          FilterDrawerLazy: true,
          FormRelationActions: true,
          },
      },
    })

    await wrapper.setProps({ open: true })
    await flushPromises()

    expect(wrapper.find('[data-testid="relation-loading"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="relation-empty"]').text()).toContain('Unable to load relations')
  })

  it('ends a hung relation request with a retry state', async () => {
    vi.useFakeTimers()
    mocks.useAuthFetch.mockImplementation((_url: string, options: { signal: AbortSignal }) => (
      new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
      })
    ))

    try {
      const wrapper = await mountSuspended(RelationSelector, {
        props: {
          relationMeta: {
            propertyName: 'settings',
            targetTableName: 'ai_settings',
            type: 'many-to-one',
          },
          selectedIds: [],
          open: false,
        },
        global: {
          stubs: {
            CommonDrawer: DrawerStub,
            CommonEmptyState: defineComponent({
              props: { title: String, description: String },
              template: '<div data-testid="relation-empty">{{ title }} {{ description }}</div>',
            }),
            DataTable: DataTableStub,
            FilterDrawerLazy: true,
            FormRelationActions: true,
              },
        },
      })

      await wrapper.setProps({ open: true })
      await flushPromises()
      expect(wrapper.find('[data-testid="relation-loading"]').exists()).toBe(true)

      vi.advanceTimersByTime(15_000)
      await flushPromises()

      expect(wrapper.find('[data-testid="relation-loading"]').exists()).toBe(false)
      expect(wrapper.get('[data-testid="relation-empty"]').text()).toContain('timed out')
    } finally {
      vi.useRealTimers()
    }
  })
})
