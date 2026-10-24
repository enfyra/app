import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { useNuxtApp } from '#app'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsTable from '~/components/data-table/SettingsTable.vue'

const state = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), remove: vi.fn(), cancel: vi.fn(), confirm: vi.fn(), notify: vi.fn(), headers: vi.fn(), allowed: undefined as unknown as { value: boolean } }))
mockNuxtImport('useHeaderActionRegistry', () => () => ({ register: state.headers }))
mockNuxtImport('usePageHeaderRegistry', () => () => ({ registerPageHeader: vi.fn() }))
mockNuxtImport('useNotify', () => () => ({ success: state.notify, error: state.notify }))
mockNuxtImport('useConfirm', () => () => ({ confirm: state.confirm }))
mockNuxtImport('usePermissions', () => () => ({ checkPermissionCondition: () => state.allowed.value }))
mockNuxtImport('useSettingsPageSize', () => () => ref(10))
mockNuxtImport('useDatabase', () => () => ({ getId: (record: any) => record?.id ?? record?._id, getIdFieldName: () => 'id' }))
mockNuxtImport('useSchema', () => () => ({ ensureSchema: async () => undefined }))
mockNuxtImport('useFormValidation', () => () => ({ validateForm: async () => true }))
mockNuxtImport('useApi', () => (_url: string, options: { method?: string }) => ({ executeWithResult: options.method === 'delete' ? state.remove : options.method ? state.write : state.read, cancel: state.cancel }))

import HelpersPage from '~/pages/settings/helpers/index.vue'
import HelperEditor from '~/components/helper/Editor.vue'

const FormStub = defineComponent({ name: 'HelperFormStub', props: ['modelValue', 'fieldMap', 'includes', 'mode'], template: '<div />' })
let wrapper: Awaited<ReturnType<typeof mountSuspended>> | undefined
beforeEach(async () => {
  vi.clearAllMocks()
  state.allowed = ref(true)
  await useNuxtApp().$router.replace('/settings/helpers')
  state.read.mockResolvedValue({ ok: true, data: { data: [{ id: 7, name: 'Saved helper', isEnabled: true, scriptLanguage: 'typescript' }], meta: { filterCount: 21 } } })
  state.write.mockResolvedValue({ ok: true })
  state.remove.mockResolvedValue({ ok: true })
  state.confirm.mockResolvedValue(true)
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined })
async function mountList(route = '/settings/helpers') {
  wrapper = await mountSuspended(HelpersPage, { route })
  await flushPromises()
  return wrapper
}

describe('dedicated Helpers UI', () => {
  it('uses the shared table and lightweight fields without source payloads', async () => {
    const page = await mountList()
    expect(page.get('table').text()).toContain('Saved helper')
    expect(page.getComponent(SettingsTable).props('pageLimit')).toBe(10)
    const query = state.read.mock.calls[0]![0].query
    expect(query.fields).toBe('id,name,description,isEnabled,scriptLanguage,updatedAt')
    expect(query.sort).toBe('name,id')
    expect(query.meta).toBe('filterCount')
    expect(state.headers.mock.calls[0]![0].map((action: any) => action.id)).toEqual(['helpers-refresh', 'helpers-create'])
  })

  it('submits only the helper name and keeps status and unrelated URL fields', async () => {
    const page = await mountList('/settings/helpers?page=2&status=disabled&keep=value')
    await page.get('input[aria-label="Search helpers by name"]').setValue('  current  ')
    const requests = state.read.mock.calls.length
    await page.get('form.eapp-search-field').trigger('submit')
    await expect.poll(() => useNuxtApp().$router.currentRoute.value.query).toEqual({ search: 'current', status: 'disabled', keep: 'value' })
    expect(state.read.mock.calls.at(-1)?.[0].query.filter).toEqual({ _and: [{ name: { _contains: 'current' } }, { isEnabled: { _eq: false } }] })
    expect(state.read.mock.calls.at(-1)?.[0].query.page).toBe(1)
    expect(state.read).toHaveBeenCalledTimes(requests + 1)
    await page.get('form.eapp-search-field').trigger('submit')
    await flushPromises()
    expect(state.read).toHaveBeenCalledTimes(requests + 2)
  })

  it('retains successful rows and page after a failed page request', async () => {
    const page = await mountList()
    state.read.mockResolvedValueOnce({ ok: false, aborted: false })
    page.getComponent(SettingsTable).vm.$emit('update:page', 2)
    await flushPromises()
    await vi.waitFor(() => expect(state.read.mock.calls.at(-1)?.[0].query.page).toBe(2))
    expect(page.getComponent(SettingsTable).props('page')).toBe(1)
    expect(page.get('table').text()).toContain('Saved helper')
    expect(page.text()).toContain('Helpers could not be loaded')
  })

  it('hides incompatible rows and rejects late search results', async () => {
    const page = await mountList()
    let finish!: (value: unknown) => void
    state.read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    await useNuxtApp().$router.replace('/settings/helpers?search=older')
    await flushPromises()
    expect(page.get('table').text()).not.toContain('Saved helper')
    state.read.mockResolvedValueOnce({ ok: true, data: { data: [{ id: 9, name: 'Current helper' }], meta: { filterCount: 1 } } })
    await useNuxtApp().$router.replace('/settings/helpers?search=current&status=disabled')
    await flushPromises()
    expect(state.read.mock.calls.at(-1)?.[0].query.filter).toEqual({ _and: [{ name: { _contains: 'current' } }, { isEnabled: { _eq: false } }] })
    finish({ ok: true, data: { data: [{ id: 8, name: 'Stale helper' }], meta: { filterCount: 1 } } })
    await flushPromises()
    expect(page.get('table').text()).toContain('Current helper')
    expect(page.get('table').text()).not.toContain('Stale helper')
  })

  it('serializes mutations and preserves existing rows after a rejected update', async () => {
    const page = await mountList()
    const actions = page.getComponent(SettingsTable).props('actions') as (record: any) => any[]
    const helper = { id: 7, name: 'Saved helper', isEnabled: true }
    let finish!: (value: unknown) => void
    state.write.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const pending = actions(helper)[0].onSelect()
    expect(actions(helper)[0].disabled).toBe(true)
    await actions(helper)[0].onSelect()
    expect(state.write).toHaveBeenCalledOnce()
    expect(state.write).toHaveBeenCalledWith({ id: 7, body: { isEnabled: false } })
    finish({ ok: false })
    await pending
    expect(helper.isEnabled).toBe(true)
    expect(page.get('table').text()).toContain('Saved helper')
    expect(state.read).toHaveBeenCalledOnce()
    state.allowed.value = false
    expect(actions(helper)).toEqual([])
  })

  it('reconciles a removed final page to the last existing page', async () => {
    await useNuxtApp().$router.replace('/settings/helpers?page=3')
    state.read.mockResolvedValueOnce({ ok: true, data: { data: [], meta: { filterCount: 11 } } })
    state.read.mockResolvedValueOnce({ ok: true, data: { data: [{ id: 9, name: 'Last page helper' }], meta: { filterCount: 11 } } })
    const page = await mountList('/settings/helpers?page=3')
    await vi.waitFor(() => expect(page.getComponent(SettingsTable).props('page')).toBe(2))
    expect(useNuxtApp().$router.currentRoute.value.query.page).toBe('2')
    expect(page.getComponent(SettingsTable).props('page')).toBe(2)
    expect(page.get('table').text()).toContain('Last page helper')
  })

  it('renders an empty create form without a back header action', async () => {
    wrapper = await mountSuspended(HelperEditor, { props: { mode: 'create' }, global: { stubs: { FormEditorLazy: FormStub, FormCodeEditorLazy: true } } })
    await flushPromises()
    const actions = state.headers.mock.calls[0]![0]
    expect(actions.map((action: any) => action.id)).toEqual(['helper-reset', 'helper-delete', 'helper-save'])
    expect(actions.some((action: any) => action.icon === 'lucide:arrow-left' || action.to === '/settings/helpers')).toBe(false)
    const form = wrapper.getComponent(FormStub)
    expect(form.props('modelValue').sourceCode).toBe('')
    expect(form.props('modelValue').isEnabled).toBe(false)
    expect(form.props('includes')).not.toContain('compiledCode')
    expect(form.props('fieldMap').sourceCode.componentProps.readonly).toBe(false)
    expect(wrapper.text()).toContain('Tests run real code')
    state.allowed.value = false
    await wrapper.setProps({ mode: 'update' })
    expect(form.props('fieldMap').sourceCode.componentProps.readonly).toBe(true)
  })
})
