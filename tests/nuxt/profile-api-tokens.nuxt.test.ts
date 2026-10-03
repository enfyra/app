import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, ref, unref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HeaderAction } from '~/types/ui'
import ApiTokensTable from '~/components/profile/ApiTokensTable.vue'

const { request, confirm, success, error } = vi.hoisted(() => ({ request: vi.fn(), confirm: vi.fn(), success: vi.fn(), error: vi.fn() }))
mockNuxtImport('useNotify', () => () => ({ success, error }))
mockNuxtImport('useConfirm', () => () => ({ confirm }))
mockNuxtImport('useApi', () => (_path: unknown, options: { method?: string }) => {
  const data = ref<any>(null)
  const pending = ref(false)
  const error = ref<Error | null>(null)
  return { data, pending, error, execute: async (payload?: unknown) => {
    pending.value = true
    error.value = null
    try { data.value = await request(options.method ?? 'get', payload) }
    catch (failure) { error.value = failure as Error }
    finally { pending.value = false }
  } }
})

const ModalStub = defineComponent({
  props: { open: Boolean, primaryAction: Object },
  emits: ['update:open'],
  template: `<div v-if="open" data-testid="token-dialog"><slot name="header" /><slot name="body" /><button v-if="primaryAction" data-testid="create-token" @click="primaryAction.onClick()">Create token</button><button data-testid="close-dialog" @click="$emit('update:open', false)">Close</button></div>`,
})

function action(id: string) {
  return useState<HeaderAction[]>('header-actions').value.find(item => item.id === id)!
}

function token(index: number) {
  return { id: `token-${index}`, name: `Token ${index}`, prefix: 'preview', last4: String(index).padStart(4, '0'), expiresAt: 'never', lastUsedAt: null, createdAt: '2026-01-01T00:00:00Z' }
}

beforeEach(() => {
  request.mockReset()
  confirm.mockReset().mockResolvedValue(true)
  success.mockClear()
  error.mockClear()
  localStorage.removeItem('settings-page-size:me-api-tokens')
})

describe('profile API token table', () => {
  it('uses native table pagination and direct Revoke buttons with confirmation', async () => {
    let records = Array.from({ length: 21 }, (_, index) => token(index + 1))
    request.mockImplementation(async (method: string, payload?: { id?: string }) => {
      if (method === 'delete') { records = records.filter(record => record.id !== payload?.id); return {} }
      return { data: records }
    })
    const wrapper = await mountSuspended(ApiTokensTable, { route: '/me?tab=api-tokens', global: { stubs: { CommonModal: ModalStub } } })
    try {
      await flushPromises()
      expect(wrapper.findAll('tbody tr')).toHaveLength(10)
      expect(wrapper.text()).toContain('preview...0001')
      expect(wrapper.text()).toContain('No expiration')
      expect(wrapper.findComponent({ name: 'UDropdownMenu' }).exists()).toBe(false)
      await wrapper.get('[aria-label="Next Page"]').trigger('click')
      expect(wrapper.findAll('tbody tr')).toHaveLength(10)
      await wrapper.get('[aria-label="Next Page"]').trigger('click')
      expect(wrapper.findAll('tbody tr')).toHaveLength(1)
      expect(wrapper.text()).toContain('Token 21')
      confirm.mockResolvedValueOnce(false)
      await wrapper.get('[aria-label="Revoke Token 21"]').trigger('click')
      await flushPromises()
      expect(request).not.toHaveBeenCalledWith('delete', expect.anything())
      await wrapper.get('[aria-label="Revoke Token 21"]').trigger('click')
      await flushPromises()
      expect(request).toHaveBeenCalledWith('delete', { id: 'token-21' })
      expect(wrapper.findAll('tbody tr')).toHaveLength(10)
      expect(wrapper.text()).not.toContain('Token 21')
      await wrapper.setProps({ active: false })
      expect(unref(action('create-api-token').show)).toBe(false)
    } finally { wrapper.unmount() }
  })

  it('shows a generated secret only in its creation dialog and retains rows after a failed revoke', async () => {
    let records = [token(1)]
    request.mockImplementation(async (method: string) => {
      if (method === 'post') { records = [...records, token(2)]; return { ...token(2), token: 'fixture-secret-once' } }
      if (method === 'delete') throw new Error('Revoke failed')
      return { data: records }
    })
    const wrapper = await mountSuspended(ApiTokensTable, { route: '/me?tab=api-tokens', global: { stubs: { CommonModal: ModalStub } } })
    try {
      await flushPromises()
      await action('create-api-token').onClick?.()
      await flushPromises()
      await wrapper.get('[data-testid="create-token"]').trigger('click')
      await flushPromises()
      expect(request).toHaveBeenCalledWith('post', { body: { name: 'MCP token', expiresAt: expect.any(String) } })
      expect(wrapper.get('[data-testid="token-dialog"] input[readonly]').element).toHaveProperty('value', 'fixture-secret-once')
      expect(wrapper.get('table').text()).not.toContain('fixture-secret-once')
      await wrapper.get('[data-testid="close-dialog"]').trigger('click')
      await action('create-api-token').onClick?.()
      await flushPromises()
      expect(wrapper.find('input[readonly]').exists()).toBe(false)
      await wrapper.get('[data-testid="close-dialog"]').trigger('click')
      await wrapper.get('[aria-label="Revoke Token 1"]').trigger('click')
      await flushPromises()
      expect(wrapper.findAll('tbody tr')).toHaveLength(2)
      expect(error).toHaveBeenCalledWith('Revoke API token failed', 'Revoke failed')
    } finally { wrapper.unmount() }
  })
})
