import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { useRouter } from '#app'
import { defineComponent, ref, unref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import MePage from '~/pages/me.vue'
import type { HeaderAction } from '~/types/ui'

mockNuxtImport('useNotify', () => () => ({ success: vi.fn(), error: vi.fn() }))
mockNuxtImport('useConfirm', () => () => ({ confirm: vi.fn() }))
mockNuxtImport('usePageHeaderRegistry', () => () => ({ registerPageHeader: vi.fn() }))
mockNuxtImport('useFormValidation', () => () => ({ validateForm: vi.fn() }))
mockNuxtImport('useDatabase', () => () => ({ getId: (record: any) => record.id }))
mockNuxtImport('useSchema', () => () => ({
  getReadableFields: () => 'id,email,fullName',
  useFormChanges: () => ({ originalData: ref(null), update: vi.fn(), discardChanges: vi.fn() }),
}))
mockNuxtImport('useApi', () => (path: () => string) => {
  const value = path() === '/me/oauth-accounts'
    ? { data: [{ id: 'account-1', provider: 'google', providerUserId: '1181581234567893997', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-02-01T00:00:00Z' }] }
    : { data: [{ id: 'user-1', email: 'user@example.test', fullName: 'Initial name' }] }
  return { data: ref(value), pending: ref(false), execute: vi.fn(), executeWithResult: vi.fn().mockResolvedValue({ ok: true, data: value }) }
})

const FormStub = defineComponent({
  props: { modelValue: Object },
  emits: ['update:modelValue', 'has-changed'],
  template: `<input data-testid="full-name" :value="modelValue.fullName" @input="$emit('update:modelValue', { ...modelValue, fullName: $event.target.value }); $emit('has-changed', true)" />`,
})

async function mountPage(route: string) {
  const wrapper = await mountSuspended(MePage, { route, global: { stubs: { FormEditorLazy: FormStub, ProfileApiTokensTable: true } } })
  await flushPromises()
  return wrapper
}

describe('/me tabs', () => {
  it('opens URL tabs and shows full linked-account details only inside Profile, without admin links', async () => {
    const wrapper = await mountPage('/me?tab=password')
    try {
      expect(wrapper.findAll('[role="tab"]').map(tab => tab.text())).toEqual(['Profile', 'Password', 'API Tokens'])
      expect(wrapper.get('[role="tab"][id$="password"]').attributes('aria-selected')).toBe('true')
      expect(wrapper.findComponent({ name: 'CommonModal' }).exists()).toBe(false)
      await useRouter().replace({ query: { tab: 'invalid' } })
      await flushPromises()
      expect(wrapper.get('[role="tab"][id$="profile"]').attributes('aria-selected')).toBe('true')
      expect(wrapper.text()).toContain('1181581234567893997')
      expect(wrapper.text()).toContain('account-1')
      expect(wrapper.text()).toContain('Linked on')
      expect(wrapper.text()).toContain('Updated')
      expect(wrapper.find('a[href^="/settings/oauth"]').exists()).toBe(false)
    } finally { wrapper.unmount() }
  })

  it('preserves profile and password drafts and scopes header actions while changing URL tabs', async () => {
    const wrapper = await mountPage('/me?tab=profile&keep=1')
    const router = useRouter()
    const actions = useState<HeaderAction[]>('header-actions')
    const visible = () => actions.value.filter(action => unref(action.show) !== false).map(action => action.id)
    try {
      await wrapper.get('[data-testid="full-name"]').setValue('Draft name')
      expect(visible()).toContain('save-profile')
      await wrapper.get('[role="tab"][id$="password"]').trigger('mousedown', { button: 0, ctrlKey: false })
      await expect.poll(() => router.currentRoute.value.query.tab).toBe('password')
      expect(router.currentRoute.value.query.keep).toBe('1')
      await wrapper.get('input[placeholder="Enter new password"]').setValue('draft-password')
      expect(visible()).toContain('change-password')
      expect(visible()).not.toContain('save-profile')
      await router.replace({ query: { ...router.currentRoute.value.query, tab: 'profile' } })
      await flushPromises()
      expect((wrapper.get('[data-testid="full-name"]').element as HTMLInputElement).value).toBe('Draft name')
      expect((wrapper.get('input[placeholder="Enter new password"]').element as HTMLInputElement).value).toBe('draft-password')
      expect(visible()).not.toContain('change-password')
    } finally { wrapper.unmount() }
  })
})
