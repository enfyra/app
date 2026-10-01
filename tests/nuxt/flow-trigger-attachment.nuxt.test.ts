import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import TriggersPanel from '~/components/flow/TriggersPanel.vue'

const mocks = vi.hoisted(() => ({ create: vi.fn(), fetch: vi.fn() }))

mockNuxtImport('useApi', () => (path: string | (() => string), options?: { method?: string }) => ({
  data: ref(options?.method ? null : { data: [] }),
  pending: ref(false),
  error: ref(null),
  execute: options?.method ? mocks.create : mocks.fetch,
}))

describe('route flow attachment', () => {
  it('shows available methods and attaches the selected method on the webhook trigger', async () => {
    mocks.create.mockReset()
    mocks.fetch.mockReset()
    const wrapper = await mountSuspended(TriggersPanel, {
      route: '/settings/routes/1',
      props: { mode: 'route', routeId: 1, availableMethods: ['GET', 'POST'] },
    })
    await flushPromises()
    await wrapper.findAll('button').find(button => button.text().includes('Attach Flow'))!.trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('HTTP method')
    const methodSelect = wrapper.findAllComponents({ name: 'USelect' }).find(select => select.props('items')?.some((item: any) => item.value === 'POST'))
    expect(methodSelect).toBeDefined()
    expect(methodSelect!.props('placeholder')).toBe('Select HTTP method')
    await wrapper.findComponent({ name: 'UInputMenu' }).vm.$emit('update:modelValue', { label: 'Order flow', value: '42' })
    methodSelect!.vm.$emit('update:modelValue', 'POST')
    await nextTick()
    const attachButton = Array.from(document.body.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Attach')
    expect(attachButton).toBeDefined()
    attachButton!.click()
    await flushPromises()
    expect(mocks.create).toHaveBeenCalledWith({ body: expect.objectContaining({ type: 'webhook', config: { method: 'POST' } }) })
  })
})
