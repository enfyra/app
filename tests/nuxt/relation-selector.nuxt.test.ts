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
  buildQuery: () => ({}),
  hasActiveFilters: () => false,
  countActiveFilters: () => 0,
}))

mockNuxtImport('useMounted', () => () => ({ isMounted: ref(true) }))
mockNuxtImport('useSchema', () => () => ({
  definition: ref([]),
  getColumnFields: mocks.getColumnFields,
}))
mockNuxtImport('useScreen', () => () => ({ isMobile: ref(false), isTablet: ref(false) }))
mockNuxtImport('useAuthFetch', () => mocks.useAuthFetch)

import RelationSelector from '~/components/form/relation/Selector.vue'

const DrawerStub = defineComponent({
  props: { modelValue: Boolean },
  template: '<div><slot name="body" /><slot name="footer" /></div>',
})

describe('FormRelationSelector', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    mocks.getColumnFields.mockResolvedValue('id,name')
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
          CommonLoadingState: defineComponent({
            template: '<div data-testid="relation-loading" />',
          }),
          FilterDrawerLazy: true,
          FormRelationActions: true,
          FormRelationCreateDrawer: true,
          FormRelationList: true,
          FormRelationPagination: true,
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
            CommonLoadingState: defineComponent({
              template: '<div data-testid="relation-loading" />',
            }),
            FilterDrawerLazy: true,
            FormRelationActions: true,
            FormRelationCreateDrawer: true,
            FormRelationList: true,
            FormRelationPagination: true,
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
