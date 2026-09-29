import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import TriggersCard from '~/components/flow/TriggersCard.vue'

const mocks = vi.hoisted(() => ({ create: vi.fn(), fetchRoutes: vi.fn() }))

mockNuxtImport('useApi', () => (path: string | (() => string), options?: { method?: string }) => ({
  data: ref(null),
  pending: ref(false),
  error: ref(null),
  execute: options?.method ? mocks.create : mocks.fetchRoutes,
}))

describe('flow editor webhook trigger', () => {
  it('selects an available route method and persists it with the trigger', async () => {
    mocks.create.mockReset()
    mocks.fetchRoutes.mockReset().mockResolvedValue({ data: [{ id: 7, path: '/orders', methodConfigs: [
      { available: true, method: { name: 'POST' } },
      { available: false, method: { name: 'DELETE' } },
    ] }] })
    const wrapper = await mountSuspended(TriggersCard, {
      route: '/settings/flows/42',
      props: { flowId: 42, triggers: [] },
    })
    await wrapper.findAll('button').find(button => button.text().includes('Add Trigger'))!.trigger('click')
    await flushPromises()
    const webhookChoice = Array.from(document.body.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Webhook')
    expect(webhookChoice).toBeDefined()
    webhookChoice!.click()
    await flushPromises()

    const routePicker = wrapper.findAllComponents({ name: 'UInputMenu' }).find(menu => menu.props('placeholder') === 'Search route...')
    expect(routePicker).toBeDefined()
    routePicker!.vm.$emit('update:modelValue', { label: '/orders', value: '7' })
    await nextTick()
    const methodSelect = wrapper.findAllComponents({ name: 'USelect' }).find(select => select.props('items')?.some((item: any) => item.value === 'POST'))
    expect(methodSelect?.props('items')).toEqual([{ label: 'POST', value: 'POST' }])
    expect(methodSelect?.props('placeholder')).toBe('Select HTTP method')
    mocks.fetchRoutes.mockResolvedValueOnce({ data: [{ id: 8, path: '/other', methodConfigs: [] }] })
    routePicker!.vm.$emit('update:searchTerm', 'other')
    await vi.waitFor(() => expect(mocks.fetchRoutes).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(routePicker!.props('items')).toEqual([{ label: '/other', value: '8' }]))
    expect(methodSelect?.props('items')).toEqual([{ label: 'POST', value: 'POST' }])
    methodSelect!.vm.$emit('update:modelValue', 'POST')
    await nextTick()
    const saveButton = Array.from(document.body.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Save')
    expect(saveButton).toBeDefined()
    saveButton!.click()
    await flushPromises()
    expect(mocks.create).toHaveBeenCalledWith({ body: expect.objectContaining({ type: 'webhook', config: { method: 'POST' } }) })
  })
})
