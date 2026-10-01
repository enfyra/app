import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SidebarScrollArea from '~/components/sidebar/ScrollArea.vue'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('sidebar overlay scrolling', () => {
  it('scrolls an overflowing menu through an overlay track without reserving a native gutter', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute('data-reka-scroll-area-viewport') ? 200 : 0
    })
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute('data-reka-scroll-area-viewport') ? 600 : 0
    })
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(200)
    vi.stubGlobal('ResizeObserver', class {
      constructor(private callback: ResizeObserverCallback) {}
      observe() { queueMicrotask(() => this.callback([], this as unknown as ResizeObserver)) }
      unobserve() {}
      disconnect() {}
    })

    const host = document.createElement('div')
    document.body.append(host)
    const wrapper = await mountSuspended(SidebarScrollArea, { attachTo: host, slots: { default: '<a href="/data">Browse all</a>' } })
    try {
      await vi.waitFor(() => expect(wrapper.find('[data-scrollbarimpl]').exists()).toBe(true))
      const viewport = wrapper.get('[data-reka-scroll-area-viewport]').element as HTMLElement
      const track = wrapper.get('[data-scrollbarimpl]').element as HTMLElement
      expect(viewport.style.overflowY).toBe('scroll')
      expect(viewport.style.overflowX).toBe('hidden')
      expect(track.style.position).toBe('absolute')
      expect(track.style.right).toBe('0px')
      expect(wrapper.find('style').text()).toContain('scrollbar-width:none')
      expect(wrapper.get('a').attributes('href')).toBe('/data')
      track.dispatchEvent(new WheelEvent('wheel', { deltaY: 40, bubbles: true, cancelable: true }))
      expect(viewport.scrollTop).toBe(40)
      await wrapper.setProps({ collapsed: true })
      expect(wrapper.get('[data-scrollbarimpl]').classes()).toContain('invisible')
      expect(viewport.style.overflowY).toBe('scroll')
    } finally {
      wrapper.unmount()
      host.remove()
    }
  })
})
