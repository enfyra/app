import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import { UPagination } from '#components'
import ExecutionsCard from '~/components/flow/ExecutionsCard.vue'

mockNuxtImport('useDatabase', () => () => ({ getId: (row: Record<string, any>) => row.id }))

const mounted: { unmount: () => void }[] = []
afterEach(() => mounted.splice(0).forEach(wrapper => wrapper.unmount()))
const first = { id: 20, status: 'completed', startedAt: '2026-09-30T10:00:00Z', completedAt: '2026-09-30T10:00:00Z', duration: 0 }

describe('Flow history table', () => {
  it('opens an execution and forwards cursor loads without numbered pagination', async () => {
    const wrapper = await mountSuspended(ExecutionsCard, { props: { executions: [first], hasMore: true, loading: false, showTitle: false } })
    mounted.push(wrapper)
    expect(wrapper.findAll('thead th').map(cell => cell.text())).toEqual(['ID', 'Status', 'Started', 'Completed', 'Duration'])
    expect(wrapper.text()).toContain('0 ms')
    expect(wrapper.text()).toContain('1 loaded')
    expect(wrapper.text()).not.toContain('Recent Executions')
    expect(wrapper.findComponent(UPagination).exists()).toBe(false)
    await wrapper.get('tbody tr').trigger('click')
    expect(wrapper.emitted('open')?.[0]).toEqual([first])
    await wrapper.findAll('button').find(button => button.text() === 'Load more')!.trigger('click')
    expect(wrapper.emitted('loadMore')).toHaveLength(1)
    await wrapper.findAll('button').find(button => button.text() === 'Reload')!.trigger('click')
    expect(wrapper.emitted('refresh')).toHaveLength(1)
  })

  it('blocks duplicate loads and keeps appended rows when the cursor is exhausted', async () => {
    const wrapper = await mountSuspended(ExecutionsCard, { props: { executions: [first], hasMore: true, loading: true } })
    mounted.push(wrapper)
    const load = () => wrapper.findAll('button').find(button => button.text() === 'Load more')!
    expect(load().attributes('disabled')).toBeDefined()
    await load().trigger('click')
    expect(wrapper.emitted('loadMore')).toBeUndefined()
    await wrapper.setProps({ executions: [first, { ...first, id: 19, status: 'failed', duration: 44 }], hasMore: false, loading: false })
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.text()).toContain('2 loaded')
    expect(wrapper.text()).toContain('failed')
    expect(load().attributes('disabled')).toBeDefined()
  })
})
