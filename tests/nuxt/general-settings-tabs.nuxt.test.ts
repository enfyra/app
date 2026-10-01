import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { useRouter } from '#app'
import { defineComponent, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

mockNuxtImport('useNotify', () => () => ({ success: vi.fn() }))
mockNuxtImport('useConfirm', () => () => ({ confirm: vi.fn() }))
mockNuxtImport('usePermissions', () => () => ({ checkPermissionCondition: () => true }))
mockNuxtImport('useDatabase', () => () => ({ getIdFieldName: () => 'id' }))
mockNuxtImport('useFormValidation', () => () => ({ validateForm: vi.fn() }))
mockNuxtImport('usePageHeaderRegistry', () => () => ({ registerPageHeader: vi.fn() }))
mockNuxtImport('useSchema', () => () => ({
  useFormChanges: () => ({ originalData: ref(null), update: vi.fn(), discardChanges: vi.fn() }),
}))
mockNuxtImport('useApi', () => () => ({
  data: ref({ data: [{ id: 1, projectName: 'Initial project' }] }),
  pending: ref(false),
  error: ref(null),
  execute: vi.fn().mockResolvedValue(undefined),
}))

import GeneralSettings from '~/pages/settings/general/index.vue'

const FormStub = defineComponent({
  props: { modelValue: Object },
  emits: ['update:modelValue', 'has-changed'],
  template: `<input data-testid="project-name" :value="modelValue.projectName" @input="$emit('update:modelValue', { ...modelValue, projectName: $event.target.value }); $emit('has-changed', true)" />`,
})

async function mountPage(route: string) {
  const wrapper = await mountSuspended(GeneralSettings, {
    route,
    global: { stubs: {
      FormEditorLazy: FormStub,
      CommonCorsOriginList: defineComponent({ template: '<div data-testid="cors-origins">Origins</div>' }),
    } },
  })
  await flushPromises()
  return wrapper
}

describe('General Settings URL tabs', () => {
  it('opens CORS directly from the URL and falls back to General for an invalid tab', async () => {
    const wrapper = await mountPage('/settings/general?tab=cors')
    expect(wrapper.get('[role="tab"][id$="cors"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[data-testid="cors-origins"]').isVisible()).toBe(true)
    await useRouter().replace({ query: { tab: 'invalid' } })
    await flushPromises()
    expect(wrapper.get('[role="tab"][id$="general"]').attributes('aria-selected')).toBe('true')
    wrapper.unmount()
  })

  it('updates the URL, preserves other query values and drafts, and follows browser Back', async () => {
    const wrapper = await mountPage('/settings/general?tab=general&keep=1')
    const router = useRouter()
    await wrapper.get('[data-testid="project-name"]').setValue('Draft project')
    await wrapper.get('[role="tab"][id$="cors"]').trigger('mousedown', { button: 0, ctrlKey: false })
    await flushPromises()
    await expect.poll(() => router.currentRoute.value.query.tab).toBe('cors')
    expect(router.currentRoute.value.query).toMatchObject({ tab: 'cors', keep: '1' })
    await new Promise<void>(resolve => {
      const stop = router.afterEach(() => { stop(); resolve() })
      router.back()
    })
    await flushPromises()
    expect(wrapper.get('[role="tab"][id$="general"]').attributes('aria-selected')).toBe('true')
    expect((wrapper.get('[data-testid="project-name"]').element as HTMLInputElement).value).toBe('Draft project')
    wrapper.unmount()
  })
})
