import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import DataTable from '~/components/data-table/DataTable.vue'

const viewport = vi.hoisted(() => ({ mobile: true }))
mockNuxtImport('useScreen', () => () => ({ isMobile: ref(viewport.mobile) }))

const mounted: { unmount: () => void }[] = []
afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  vi.unstubAllGlobals()
  viewport.mobile = true
})

const props = {
  page: 2,
  data: [{ id: 3 }, { id: 2 }],
  columns: [{ accessorKey: 'id', header: 'ID' }],
  showColumnVisibility: false,
  paginationConfig: { mode: 'cursor' as const, itemsPerPage: 10, hasNextPage: true },
}

function observePagination() {
  const observers: { callback: IntersectionObserverCallback; target?: Element }[] = []
  class Observer {
    constructor(readonly callback: IntersectionObserverCallback) { observers.push(this) }
    target?: Element
    observe(target: Element) { this.target = target }
    disconnect() {}
  }
  vi.stubGlobal('IntersectionObserver', Observer)
  return {
    observers,
    notify(observer: typeof observers[number], visible: boolean) {
      observer.callback([{ target: observer.target, isIntersecting: visible } as IntersectionObserverEntry], observer as unknown as IntersectionObserver)
    },
  }
}

describe('mobile cursor floating pagination', () => {
  it('shares page navigation, range and pending state with the main footer', async () => {
    const { observers, notify } = observePagination()
    const wrapper = await mountSuspended(DataTable, { props })
    mounted.push(wrapper)
    const footer = observers.find(observer => observer.target?.getAttribute('aria-label') === 'Table pagination')!
    const scope = observers.find(observer => observer !== footer)!
    const mini = document.body.querySelector<HTMLElement>('[aria-label="Floating table pagination"]')!
    expect(mini).not.toBeNull()
    expect(mini.style.display).toBe('none')
    notify(footer, false)
    notify(scope, true)
    await nextTick()
    expect(mini.style.display).not.toBe('none')
    expect(mini.textContent).toContain('11–12')
    const buttons = () => Array.from(mini.querySelectorAll('button'))
    buttons().find(button => button.textContent?.includes('Next'))!.click()
    await nextTick()
    expect(wrapper.emitted('update:page')?.[0]).toEqual([3])
    await wrapper.setProps({ page: 3, paginationConfig: { ...props.paginationConfig, loading: true } })
    expect(buttons().every(button => button.disabled)).toBe(true)
    await wrapper.setProps({ paginationConfig: { ...props.paginationConfig, hasNextPage: false } })
    expect(buttons().find(button => button.textContent?.includes('Next'))!.disabled).toBe(true)
    buttons().find(button => button.textContent?.includes('Previous'))!.click()
    await nextTick()
    expect(wrapper.emitted('update:page')?.[1]).toEqual([2])
    notify(footer, true)
    await nextTick()
    expect(mini.style.display).toBe('none')
    notify(footer, false)
    notify(scope, false)
    await nextTick()
    expect(mini.style.display).toBe('none')
  })

  it('does not mount the cursor floating pager on desktop or when disabled', async () => {
    const { observers } = observePagination()
    viewport.mobile = false
    const desktop = await mountSuspended(DataTable, { props })
    mounted.push(desktop)
    expect(document.body.querySelector('[aria-label="Floating table pagination"]')).toBeNull()
    expect(observers).toHaveLength(0)
    viewport.mobile = true
    const disabled = await mountSuspended(DataTable, { props: { ...props, paginationConfig: { ...props.paginationConfig, floating: false } } })
    mounted.push(disabled)
    expect(document.body.querySelector('[aria-label="Floating table pagination"]')).toBeNull()
    expect(observers).toHaveLength(0)
  })

  it('keeps Previous available on the final page', async () => {
    const { observers, notify } = observePagination()
    const wrapper = await mountSuspended(DataTable, { props: { ...props, paginationConfig: { ...props.paginationConfig, hasNextPage: false } } })
    mounted.push(wrapper)
    const footer = observers.find(observer => observer.target?.getAttribute('aria-label') === 'Table pagination')!
    notify(footer, false)
    notify(observers.find(observer => observer !== footer)!, true)
    await nextTick()
    const mini = document.body.querySelector<HTMLElement>('[aria-label="Floating table pagination"]')!
    expect(mini.style.display).not.toBe('none')
    const previous = Array.from(mini.querySelectorAll('button')).find(button => button.textContent?.includes('Previous'))!
    expect(previous.disabled).toBe(false)
    previous.click()
    await nextTick()
    expect(wrapper.emitted('update:page')?.[0]).toEqual([1])
  })
})
