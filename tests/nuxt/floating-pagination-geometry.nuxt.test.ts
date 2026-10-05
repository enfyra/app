import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import PaginationBar from '~/components/common/PaginationBar.vue'

describe('floating pagination workspace geometry', () => {
  it('centers on the main frame and tracks sidebar width changes', async () => {
    const panel = document.createElement('section')
    panel.className = 'eapp-shell-main'
    document.body.append(panel)
    const bounds = vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(new DOMRect(256, 24, 1024, 720))
    const observers: { callback: ResizeObserverCallback; target?: Element; disconnect: ReturnType<typeof vi.fn> }[] = []
    class Observer {
      target?: Element
      disconnect = vi.fn()
      constructor(readonly callback: ResizeObserverCallback) { observers.push(this) }
      observe(target: Element) { this.target = target }
      unobserve() {}
    }
    vi.stubGlobal('ResizeObserver', Observer)
    const wrapper = await mountSuspended(PaginationBar, { attachTo: panel, props: { page: 1, itemsPerPage: 10, total: 100 } })
    try {
      await flushPromises()
      const mini = document.querySelector<HTMLElement>('.eapp-pagination-mini')!
      expect(mini.style.getPropertyValue('--pagination-workspace-center')).toBe('768px')
      expect(mini.style.getPropertyValue('--pagination-workspace-width')).toBe('1024px')
      const observer = observers.find(observer => observer.target === panel)!
      expect(observer).toBeDefined()
      bounds.mockReturnValue(new DOMRect(64, 24, 1216, 720))
      observer.callback([], observer as unknown as ResizeObserver)
      await flushPromises()
      expect(mini.style.getPropertyValue('--pagination-workspace-center')).toBe('672px')
      expect(mini.style.getPropertyValue('--pagination-workspace-width')).toBe('1216px')
      wrapper.unmount()
      expect(observer.disconnect).toHaveBeenCalledOnce()
    } finally {
      if (wrapper.exists()) wrapper.unmount()
      bounds.mockRestore()
      panel.remove()
      vi.unstubAllGlobals()
    }
  })
})
