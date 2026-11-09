import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref, toValue } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ reads: vi.fn(), writes: vi.fn(), actions: new Map<string, any>() }))
mockNuxtImport('useHeaderActionRegistry', () => () => ({ register: (items: any[]) => items.forEach(item => state.actions.set(item.id, item)) }))
mockNuxtImport('useSubHeaderActionRegistry', () => () => ({ register: vi.fn() }))
mockNuxtImport('usePageHeaderRegistry', () => () => ({ registerPageHeader: vi.fn() }))
mockNuxtImport('usePermissions', () => () => ({ checkPermissionCondition: () => true }))
mockNuxtImport('useNotify', () => () => ({ success: vi.fn(), error: vi.fn() }))
mockNuxtImport('useConfirm', () => () => ({ confirm: async () => true }))
mockNuxtImport('useDatabase', () => () => ({ getId: (row: any) => row?.id, getIdFieldName: () => 'id' }))
mockNuxtImport('useRoutes', () => () => ({ routes: ref([]), loadRoutes: vi.fn() }))
mockNuxtImport('useMenuRegistry', () => () => ({ registerDataMenuItemsFromRoutes: vi.fn() }))
mockNuxtImport('useServerSync', () => () => ({ retryUntilFresh: vi.fn() }))
mockNuxtImport('useFormValidation', () => () => ({ validateForm: async () => true }))
mockNuxtImport('useUnsavedChangesGuard', () => vi.fn())
mockNuxtImport('useSchema', () => () => ({
  schemas: ref({}), schema: ref(null), ensureSchema: async () => undefined,
  getIncludeFields: async () => '*', generateEmptyForm: () => ({}), validate: async () => ({}),
  useFormChanges: () => {
    const originalData = ref<any>(null)
    return { originalData, update: (value: any) => { originalData.value = JSON.parse(JSON.stringify(value)) } }
  },
}))
mockNuxtImport('useApi', () => (url: string | (() => string), options: any = {}) => {
  const data = ref<any>(null)
  const pending = ref(false)
  const error = ref(null)
  const execute = vi.fn(async () => {
    pending.value = true
    await Promise.resolve()
    const path = toValue(url)
    const query = toValue(options.query)
    if (options.method && options.method !== 'get') state.writes(path)
    else state.reads(path, query)
    const routeKey = query?.filter?.id?._eq ?? query?.filter?.mainTable?.name?._eq
    data.value = { data: path === '/enfyra_route' ? [{
      id: Number(routeKey) || 426, path: `/example-${routeKey}`, isSystem: false, isEnabled: true,
      methodConfigs: [{ id: 658, method: { id: 1, name: 'GET' }, available: true, timeout: 30_000, fileFields: [] }],
    }] : [] }
    pending.value = false
    return data.value
  })
  return { data, pending, error, execute, executeWithResult: async () => ({ ok: true, data: await execute() }) }
})

import RouteDetail from '~/pages/settings/routes/[id].vue'
import RouteEditor from '~/components/route/EditorPanel.vue'
import Panel from '~/components/common/Panel.vue'

const EditorStub = defineComponent({
  name: 'FormEditorLazy', props: ['modelValue'],
  setup: props => () => h('div', { 'data-testid': 'route-form' }, props.modelValue.path),
})
const stubs = {
  FormEditorLazy: EditorStub, DataTable: true, CommonDrawer: true,
  RouteExecutionFlowVisualization: true, FlowTriggersPanel: true, GuardRouteGuardSection: true, PermissionManager: true,
  RouteCreateHandlerDrawer: true, RouteEditHandlerDrawer: true, RouteCreateHookDrawer: true, RouteEditHookDrawer: true,
  RouteApiTestModal: true,
}

beforeEach(() => { vi.clearAllMocks(); state.actions.clear() })

describe('route detail initial loading', () => {
  it('loads both header metadata and the editor on a direct visit', async () => {
    const wrapper = await mountSuspended(RouteDetail, { route: '/settings/routes/426', global: { stubs } })
    try {
      await flushPromises()
      const reads = state.reads.mock.calls.filter(([path]) => path === '/enfyra_route')
      expect(reads).toHaveLength(2)
      expect(reads.some(([, query]) => query.fields === 'id,path,isSystem')).toBe(true)
      expect(wrapper.getComponent(Panel).props('sections')?.map(section => section.value)).toEqual(['overview', 'methods', 'execution', 'access'])
      expect(wrapper.get('[data-testid="route-form"]').text()).toBe('/example-426')
      expect([...new Set(state.reads.mock.calls.map(([path]) => path))]).toEqual(expect.arrayContaining([
        '/enfyra_route', '/enfyra_route_handler', '/enfyra_pre_hook', '/enfyra_post_hook', '/enfyra_guard',
      ]))
      expect(state.writes).not.toHaveBeenCalled()
    } finally { wrapper.unmount() }
  })

  it('loads the shared editor when embedded and reloads for a different route id', async () => {
    const wrapper = await mountSuspended(RouteEditor, { props: { routeId: '426', embedded: true }, global: { stubs } })
    try {
      await flushPromises()
      expect(state.reads.mock.calls.filter(([path]) => path === '/enfyra_route')).toHaveLength(1)
      expect(wrapper.get('[data-testid="route-form"]').text()).toBe('/example-426')
      expect(wrapper.getComponent(Panel).props('framed')).toBe(false)
      await wrapper.setProps({ routeId: '427' })
      await flushPromises()
      expect(wrapper.get('[data-testid="route-form"]').text()).toBe('/example-427')
      expect(state.reads.mock.calls.filter(([path]) => path === '/enfyra_route')).toHaveLength(2)
      expect(state.writes).not.toHaveBeenCalled()
    } finally { wrapper.unmount() }
  })

  it('loads by collection name and refreshes when the collection changes', async () => {
    const wrapper = await mountSuspended(RouteEditor, { props: { tableName: 'orders', embedded: true }, global: { stubs } })
    try {
      await flushPromises()
      expect(wrapper.get('[data-testid="route-form"]').text()).toBe('/example-orders')
      const first = state.reads.mock.calls.find(([path]) => path === '/enfyra_route')
      expect(first?.[1].filter).toEqual({ mainTable: { name: { _eq: 'orders' } } })
      await wrapper.setProps({ tableName: 'invoices' })
      await flushPromises()
      expect(wrapper.get('[data-testid="route-form"]').text()).toBe('/example-invoices')
      const reads = state.reads.mock.calls.filter(([path]) => path === '/enfyra_route')
      expect(reads).toHaveLength(2)
      expect(reads[1]?.[1].filter).toEqual({ mainTable: { name: { _eq: 'invoices' } } })
      expect(state.writes).not.toHaveBeenCalled()
    } finally { wrapper.unmount() }
  })

  it('does not read an unfiltered route collection before a target is provided', async () => {
    const wrapper = await mountSuspended(RouteEditor, { global: { stubs } })
    try {
      await flushPromises()
      expect(state.reads).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('No route configured')
      await wrapper.setProps({ routeId: '426' })
      await flushPromises()
      expect(wrapper.get('[data-testid="route-form"]').text()).toBe('/example-426')
      expect(state.reads.mock.calls.filter(([path]) => path === '/enfyra_route')).toHaveLength(1)
      expect(state.writes).not.toHaveBeenCalled()
    } finally { wrapper.unmount() }
  })
})
