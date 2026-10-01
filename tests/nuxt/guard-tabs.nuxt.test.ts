import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { nextTick, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SettingsTable from '~/components/data-table/SettingsTable.vue'

const fetchGate = vi.hoisted(() => ({ wait: undefined as Promise<void> | undefined }))

mockNuxtImport('useHeaderActionRegistry', () => () => ({ register: vi.fn() }))
mockNuxtImport('usePageHeaderRegistry', () => () => ({ registerPageHeader: vi.fn() }))
mockNuxtImport('useNotify', () => () => ({ showSuccess: vi.fn(), showError: vi.fn() }))
mockNuxtImport('useConfirm', () => () => ({ confirm: vi.fn() }))
mockNuxtImport('useSettingsPageSize', () => () => ref(10))
mockNuxtImport('useDatabase', () => () => ({ getId: (record: { id?: number }) => record?.id, getIdFieldName: () => 'id' }))
mockNuxtImport('useApi', () => (_url: unknown, options: { query?: { value?: { filter?: { _and: { type?: { _eq: string } }[] } } } }) => {
  const data = ref({ data: [{ id: 1, name: 'Route test', isEnabled: true }], meta: { filterCount: 1 } })
  const pending = ref(false)
  return { data, pending, execute: async () => {
    pending.value = true
    await nextTick()
    await fetchGate.wait
    const type = options.query?.value?.filter?._and.find(condition => condition.type)?.type?._eq
    data.value = { data: [{ id: type === 'graphql' ? 2 : 1, name: type === 'graphql' ? 'GraphQL test' : 'Route test', isEnabled: true }], meta: { filterCount: 1 } }
    pending.value = false
    return data.value
  } }
})

import GuardsPage from '~/pages/settings/guards/index.vue'

describe('guard target tabs', () => {
  it('retains rows on same-target refresh and hides them while switching targets', async () => {
    const wrapper = await mountSuspended(GuardsPage, {
      global: { stubs: { transition: false, FilterDrawerLazy: true, CommonDrawer: true } },
    })
    let release = () => {}
    try {
      await new Promise(resolve => setTimeout(resolve, 450))
      await flushPromises()
      expect(wrapper.get('table').text()).toContain('Route test')
      fetchGate.wait = new Promise<void>(resolve => { release = resolve })
      wrapper.getComponent(SettingsTable).vm.$emit('page-size-change', 20)
      await flushPromises()
      expect(wrapper.get('table').text()).toContain('Route test')
      expect(wrapper.get('thead').classes()).toContain('after:bg-primary')
      release()
      await flushPromises()
      fetchGate.wait = new Promise<void>(resolve => { release = resolve })
      await wrapper.get('[role="tab"][id$="graphql"]').trigger('mousedown', { button: 0, ctrlKey: false })
      await flushPromises()
      expect(wrapper.get('table').text()).not.toContain('Route test')
      release()
      await flushPromises()
      expect(wrapper.get('table').text()).toContain('GraphQL test')
    } finally {
      release()
      fetchGate.wait = undefined
      await flushPromises()
      wrapper.unmount()
    }
  })

  it('renders fresh rows and summaries across repeated route and GraphQL changes', async () => {
    const wrapper = await mountSuspended(GuardsPage, {
      global: { stubs: { transition: false, FilterDrawerLazy: true, CommonDrawer: true } },
    })
    await new Promise(resolve => setTimeout(resolve, 450))
    await flushPromises()
    expect(wrapper.get('table').text()).toContain('Route test')
    for (let i = 0; i < 2; i++) {
      await wrapper.get('[role="tab"][id$="graphql"]').trigger('mousedown', { button: 0, ctrlKey: false })
      await new Promise(resolve => setTimeout(resolve, 100))
      await flushPromises()
      expect(wrapper.get('table').text()).toContain('GraphQL test')
      expect(wrapper.text()).toContain('Enabled GraphQL guards')
      await wrapper.get('[role="tab"][id$="route"]').trigger('mousedown', { button: 0, ctrlKey: false })
      await new Promise(resolve => setTimeout(resolve, 100))
      await flushPromises()
      expect(wrapper.get('table').text()).toContain('Route test')
    }
    wrapper.unmount()
  })
})
