import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { unref, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HeaderAction } from '~/types/ui'
import ChangePasswordForm from '~/components/profile/ChangePasswordForm.vue'

const { patch, success, error } = vi.hoisted(() => ({ patch: vi.fn(), success: vi.fn(), error: vi.fn() }))
mockNuxtImport('useNotify', () => () => ({ success, error }))
mockNuxtImport('useApi', () => () => {
  const pending = ref(false)
  return { pending, executeWithResult: async (payload: unknown) => {
    pending.value = true
    try { return await patch(payload) } finally { pending.value = false }
  } }
})

function action(id: string) {
  return useState<HeaderAction[]>('header-actions').value.find(item => item.id === id)!
}

beforeEach(() => {
  patch.mockReset().mockResolvedValue({ ok: true })
  success.mockClear()
  error.mockClear()
})

describe('profile password tab', () => {
  it('validates the password and confirmation before making a request', async () => {
    const wrapper = await mountSuspended(ChangePasswordForm, { route: '/me?tab=password' })
    try {
      await wrapper.get('input[placeholder="Enter new password"]').setValue('short')
      await wrapper.get('input[placeholder="Confirm new password"]').setValue('different')
      await action('change-password').submit?.()
      await flushPromises()
      expect(patch).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('Password must be at least 6 characters')
      expect(wrapper.text()).toContain('Passwords do not match')
    } finally { wrapper.unmount() }
  })

  it('submits only the new password, keeps failed drafts and clears successful drafts', async () => {
    const wrapper = await mountSuspended(ChangePasswordForm, { route: '/me?tab=password' })
    try {
      await wrapper.get('input[placeholder="Enter new password"]').setValue('test-password')
      await wrapper.get('input[placeholder="Confirm new password"]').setValue('test-password')
      patch.mockResolvedValueOnce({ ok: false })
      await action('change-password').submit?.()
      expect(patch).toHaveBeenCalledWith({ body: { password: 'test-password' } })
      expect(success).not.toHaveBeenCalled()
      expect((wrapper.get('input[placeholder="Enter new password"]').element as HTMLInputElement).value).toBe('test-password')
      await action('change-password').submit?.()
      await flushPromises()
      expect(success).toHaveBeenCalledOnce()
      expect((wrapper.get('input[placeholder="Enter new password"]').element as HTMLInputElement).value).toBe('')
      expect((wrapper.get('input[placeholder="Confirm new password"]').element as HTMLInputElement).value).toBe('')
    } finally { wrapper.unmount() }
  })

  it('scopes its action to the active tab and prevents duplicate in-flight changes', async () => {
    let finish!: (value: unknown) => void
    patch.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const wrapper = await mountSuspended(ChangePasswordForm, { route: '/me?tab=password', props: { active: false } })
    try {
      await wrapper.get('input[placeholder="Enter new password"]').setValue('test-password')
      await wrapper.get('input[placeholder="Confirm new password"]').setValue('test-password')
      expect(unref(action('change-password').show)).toBe(false)
      await action('change-password').submit?.()
      expect(patch).not.toHaveBeenCalled()
      await wrapper.setProps({ active: true })
      const promise = action('change-password').submit?.()
      await flushPromises()
      expect(unref(action('change-password').loading)).toBe(true)
      await action('change-password').submit?.()
      expect(patch).toHaveBeenCalledOnce()
      finish({ ok: true })
      await promise
      await flushPromises()
      expect(unref(action('change-password').loading)).toBe(false)
    } finally { wrapper.unmount() }
  })
})
