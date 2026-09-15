import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

const Probe = defineComponent({
  setup() {
    const busy = ref(false)
    const { active } = useDeferredBusy(() => busy.value)
    return { busy, active }
  },
  template: '<div />',
})

// The watcher flushes on the microtask queue, so every state change needs a tick
// before the fake clock is advanced.
async function setBusy(wrapper: { vm: { busy: boolean } }, value: boolean) {
  wrapper.vm.busy = value
  await nextTick()
  await nextTick()
}

describe('deferred busy indicator', () => {
  it('never flashes chrome for a fast refresh', async () => {
    const wrapper = await mountSuspended(Probe)
    vi.useFakeTimers()
    try {
      await setBusy(wrapper, true)
      expect(wrapper.vm.active).toBe(false)

      vi.advanceTimersByTime(40)
      await setBusy(wrapper, false)

      vi.advanceTimersByTime(1000)
      expect(wrapper.vm.active).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows chrome once a refresh outlasts the delay', async () => {
    const wrapper = await mountSuspended(Probe)
    vi.useFakeTimers()
    try {
      await setBusy(wrapper, true)
      vi.advanceTimersByTime(160)
      expect(wrapper.vm.active).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('holds the chrome for a minimum span so it cannot strobe', async () => {
    const wrapper = await mountSuspended(Probe)
    vi.useFakeTimers()
    try {
      await setBusy(wrapper, true)
      vi.advanceTimersByTime(160)
      expect(wrapper.vm.active).toBe(true)

      await setBusy(wrapper, false)
      vi.advanceTimersByTime(100)
      expect(wrapper.vm.active, 'still within the minimum span').toBe(true)

      vi.advanceTimersByTime(300)
      expect(wrapper.vm.active).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps the chrome up when a new refresh starts during the minimum span', async () => {
    const wrapper = await mountSuspended(Probe)
    vi.useFakeTimers()
    try {
      await setBusy(wrapper, true)
      vi.advanceTimersByTime(160)
      expect(wrapper.vm.active).toBe(true)

      await setBusy(wrapper, false)
      vi.advanceTimersByTime(100)
      await setBusy(wrapper, true)

      vi.advanceTimersByTime(1000)
      expect(wrapper.vm.active, 'no hide/show cycle while still busy').toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
