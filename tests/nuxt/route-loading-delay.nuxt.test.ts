import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'

const Probe = defineComponent({
  setup() {
    const { routeLoading, routeLoadingVisible, beginRouteLoading } = useGlobalState()
    return { routeLoading, routeLoadingVisible, beginRouteLoading }
  },
  template: '<div />',
})

describe('route loading delay', () => {
  it('never flashes loading chrome for fast navigations', async () => {
    const wrapper = await mountSuspended(Probe)
    vi.useFakeTimers()
    try {
      const end = wrapper.vm.beginRouteLoading()
      expect(wrapper.vm.routeLoading).toBe(true)
      expect(wrapper.vm.routeLoadingVisible).toBe(false)

      vi.advanceTimersByTime(100)
      expect(wrapper.vm.routeLoadingVisible).toBe(false)

      end()
      vi.advanceTimersByTime(500)
      expect(wrapper.vm.routeLoading).toBe(false)
      expect(wrapper.vm.routeLoadingVisible).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows workspace loading chrome only after the delay for slow navigations', async () => {
    const wrapper = await mountSuspended(Probe)
    vi.useFakeTimers()
    try {
      const end = wrapper.vm.beginRouteLoading()
      vi.advanceTimersByTime(180)
      expect(wrapper.vm.routeLoadingVisible).toBe(true)

      end()
      expect(wrapper.vm.routeLoading).toBe(false)
      expect(wrapper.vm.routeLoadingVisible).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps newer navigation state when an older owner unmounts', async () => {
    const wrapper = await mountSuspended(Probe)
    vi.useFakeTimers()
    try {
      const endFirst = wrapper.vm.beginRouteLoading()
      const endSecond = wrapper.vm.beginRouteLoading()

      endFirst()
      vi.advanceTimersByTime(300)
      expect(wrapper.vm.routeLoading).toBe(true)

      endSecond()
      expect(wrapper.vm.routeLoading).toBe(false)
      expect(wrapper.vm.routeLoadingVisible).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})
