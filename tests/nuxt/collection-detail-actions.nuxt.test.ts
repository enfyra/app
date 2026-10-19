import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { computed, defineComponent, h, ref, unref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ actions: new Map<string, any>(), notify: vi.fn(), writes: vi.fn() }))
const fixture = { id: 42, name: 'example', isSystem: false, columns: [], relations: [], uniques: [['user', 'discount']], indexes: [['user']] }
mockNuxtImport('useHeaderActionRegistry', () => () => ({ register: (items: any) => {
  for (const item of Array.isArray(items) ? items : [items]) mocks.actions.set(item.id, item)
} }))
mockNuxtImport('useSubHeaderActionRegistry', () => () => ({ register: vi.fn() }))
mockNuxtImport('usePageHeaderRegistry', () => () => ({ registerPageHeader: vi.fn() }))
mockNuxtImport('useTableCatalog', () => () => ({ tables: ref([]), loadTableCatalog: vi.fn() }))
mockNuxtImport('useSchema', () => () => ({ schemaLoading: ref(false), getIncludeFields: async () => '*', useFormChanges: () => {
  const originalData = ref<any>(null)
  return { originalData, update: (value: any) => { originalData.value = JSON.parse(JSON.stringify(value)) }, checkChanges: (value: any) => JSON.stringify(value) !== JSON.stringify(originalData.value) }
} }))
mockNuxtImport('useDatabase', () => () => ({ getId: (value: any) => value?.id }))
mockNuxtImport('useNotify', () => () => ({ success: mocks.notify, error: mocks.notify }))
mockNuxtImport('useApi', () => (_url: any, options: any) => {
  const data = ref<any>(null)
  return { data, pending: ref(false), error: ref(null), execute: vi.fn(async (args: any) => {
    if (options.method) { mocks.writes(args); data.value = { data: [{ id: 42 }] } }
    else data.value = { data: [JSON.parse(JSON.stringify(fixture))] }
    return data.value
  }) }
})

import CollectionDetail from '~/pages/collections/[table].vue'

function actionEditor(id: string) {
  return defineComponent({
    name: id === 'route-save' ? 'RouteEditorPanel' : 'GraphqlAccessEditor',
    props: { active: { type: Boolean, default: true } },
    setup(props) {
      mocks.actions.set(id, { id, show: computed(() => props.active) })
      return () => h('div')
    },
  })
}

const visible = () => [...mocks.actions.values()].filter(action => unref(action.show) !== false)

describe('collection detail actions', () => {
  beforeEach(() => { mocks.actions.clear(); vi.clearAllMocks() })

  it('shows actions only from the selected outer tab without unmounting its drafts', async () => {
    const wrapper = await mountSuspended(CollectionDetail, { route: '/collections/example', global: { stubs: {
      TableForm: { template: '<div><slot /></div>' }, TableColumns: true, TableRelations: true, TableConstraints: true,
      RouteEditorPanel: actionEditor('route-save'), GraphqlAccessEditor: actionEditor('graphql-save'), FlowTriggersPanel: true,
    } } })
    try {
      await flushPromises()
      expect(visible().map(action => action.id)).toEqual(['reload-page', 'delete-table', 'save-table'])
      await wrapper.getComponent({ name: 'CommonPanel' }).vm.$emit('update:modelValue', 'routes')
      await flushPromises()
      expect(unref(mocks.actions.get('route-save').show)).toBe(true)
      expect(unref(mocks.actions.get('graphql-save').show)).toBe(false)
      expect(wrapper.findComponent({ name: 'GraphqlAccessEditor' }).exists()).toBe(true)
    } finally { wrapper.unmount() }
  })

  it('does not report success when refreshed constraints differ from the submitted removal', async () => {
    const wrapper = await mountSuspended(CollectionDetail, { route: '/collections/example', global: { stubs: {
      TableForm: { template: '<div><slot /></div>' }, TableColumns: true, TableRelations: true,
      TableConstraints: defineComponent({ name: 'TableConstraints', props: ['modelValue'], setup: () => () => h('div') }),
      RouteEditorPanel: true, GraphqlAccessEditor: true, FlowTriggersPanel: true,
    } } })
    try {
      await flushPromises()
      const table = wrapper.getComponent({ name: 'TableConstraints' }).props('modelValue')
      table.indexes = []
      await mocks.actions.get('save-table').submit()
      expect(mocks.writes).toHaveBeenCalled()
      expect(mocks.notify).not.toHaveBeenCalledWith('Success', 'Table structure updated!')
    } finally { wrapper.unmount() }
  })
})
