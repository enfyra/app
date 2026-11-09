import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  actions: new Map<string, any>(),
  navigateTo: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  confirm: vi.fn(),
  fetchAppPackages: vi.fn(),
  deleted: [] as any[],
  loads: 0,
  package: { id: 42, name: 'probe-pkg', type: 'Server', status: 'installed' } as any,
  socketHandlers: new Map<string, Function[]>(),
  hasUnsavedChanges: null as null | (() => boolean),
}))

mockNuxtImport('useHeaderActionRegistry', () => () => ({ register: (items: any) => {
  for (const item of Array.isArray(items) ? items : [items]) mocks.actions.set(item.id, item)
} }))
mockNuxtImport('useNotify', () => () => ({ success: mocks.notifySuccess, error: mocks.notifyError }))
mockNuxtImport('useConfirm', () => () => ({ confirm: mocks.confirm }))
mockNuxtImport('useDatabase', () => () => ({ getId: (row: any) => row?.id, getIdFieldName: () => 'id' }))
mockNuxtImport('useGlobalState', () => () => ({ fetchAppPackages: mocks.fetchAppPackages }))
mockNuxtImport('useFormValidation', () => () => ({ validateForm: async () => true }))
mockNuxtImport('useSchema', () => () => ({ useFormChanges: () => ({
  originalData: ref<any>(null),
  update: (value: any) => { mocks.package = value },
  discardChanges: (value: any) => value,
  checkChanges: () => false,
}) }))
mockNuxtImport('useUnsavedChangesGuard', () => (hasUnsavedChanges: () => boolean) => {
  mocks.hasUnsavedChanges = hasUnsavedChanges
  return { allowNextNavigation: vi.fn() }
})
mockNuxtImport('navigateTo', () => mocks.navigateTo)
mockNuxtImport('useAdminSocket', () => () => ({ adminSocket: {
  on: (event: string, handler: Function) => {
    const handlers = mocks.socketHandlers.get(event) ?? []
    handlers.push(handler)
    mocks.socketHandlers.set(event, handlers)
  },
  off: (event: string) => { mocks.socketHandlers.delete(event) },
} }))
mockNuxtImport('useApi', () => (_url: unknown, options: any) => {
  const data = ref<any>(null)
  const error = ref<any>(null)
  const pending = ref(false)
  return {
    data,
    pending,
    error,
    execute: vi.fn(async (args?: any) => {
      if (options.method === 'delete') {
        mocks.deleted.push(args)
        return { data: [] }
      }
      if (options.method === 'patch') {
        return { data: [mocks.package] }
      }
      mocks.loads += 1
      data.value = { data: [JSON.parse(JSON.stringify(mocks.package))] }
      return data.value
    }),
  }
})

import PackageDetail from '~/pages/packages/[id].vue'

const stubs = { FormEditorLazy: { template: '<div />' } }

async function mountDetail(type: string) {
  mocks.package = { id: 42, name: 'probe-pkg', type, status: 'installed' }
  const wrapper = await mountSuspended(PackageDetail, { route: '/packages/42', global: { stubs } })
  await flushPromises()
  return wrapper
}

function emitSocket(event: string, data: any) {
  for (const handler of mocks.socketHandlers.get(event) ?? []) handler(data)
}

describe('package detail uninstall', () => {
  beforeEach(() => {
    mocks.actions.clear()
    mocks.socketHandlers.clear()
    mocks.deleted.length = 0
    mocks.loads = 0
    mocks.navigateTo.mockReset()
    mocks.notifySuccess.mockReset()
    mocks.notifyError.mockReset()
    mocks.fetchAppPackages.mockReset()
    mocks.confirm.mockReset()
    mocks.confirm.mockResolvedValue(true)
    mocks.hasUnsavedChanges = null
  })

  it('returns a server package to the server package list without reloading the deleted record', async () => {
    const wrapper = await mountDetail('Server')
    try {
      const loadsBeforeUninstall = mocks.loads
      await mocks.actions.get('uninstall-package').onClick()
      await flushPromises()

      expect(mocks.deleted).toEqual([{ id: '42' }])
      expect(mocks.navigateTo).toHaveBeenCalledWith('/packages/backend', { replace: true })
      expect(mocks.loads).toBe(loadsBeforeUninstall)
      expect(wrapper.findComponent({ name: 'CommonEmptyState' }).exists()).toBe(false)
      expect(mocks.hasUnsavedChanges?.()).toBe(false)
    } finally { wrapper.unmount() }
  })

  it('returns an app package to the app package list and refreshes the global package cache', async () => {
    const wrapper = await mountDetail('App')
    try {
      await mocks.actions.get('uninstall-package').onClick()
      await flushPromises()

      expect(mocks.navigateTo).toHaveBeenCalledWith('/packages/app', { replace: true })
      expect(mocks.fetchAppPackages).toHaveBeenCalled()
      expect(mocks.notifySuccess).toHaveBeenCalled()
    } finally { wrapper.unmount() }
  })

  it('returns to the matching list when the uninstall event arrives from another session', async () => {
    const wrapper = await mountDetail('Server')
    try {
      emitSocket('$system:package:uninstalled', { id: 42, name: 'probe-pkg' })
      await flushPromises()

      expect(mocks.navigateTo).toHaveBeenCalledWith('/packages/backend', { replace: true })
    } finally { wrapper.unmount() }
  })

  it('keeps the package visible when the uninstall request fails', async () => {
    const wrapper = await mountDetail('Server')
    try {
      mocks.confirm.mockResolvedValue(false)
      await mocks.actions.get('uninstall-package').onClick()
      await flushPromises()

      expect(mocks.deleted).toHaveLength(0)
      expect(mocks.navigateTo).not.toHaveBeenCalled()
      expect(wrapper.findComponent({ name: 'CommonEmptyState' }).exists()).toBe(false)
    } finally { wrapper.unmount() }
  })
})
