import {
  hardwareCpuLabel,
  hardwareMemoryLabel,
} from '~/utils/runtime-monitor/format'
import type { RuntimeMetricsPayload } from '~/types/runtime-monitor'

function makeMetrics(hardware: RuntimeMetricsPayload['hardware']) {
  return { hardware } as RuntimeMetricsPayload
}

describe('runtime monitor format', () => {
  it('shows allocated hardware as the primary RAM and CPU labels', () => {
    const metrics = makeMetrics({
      effectiveMemoryMb: 1024,
      effectiveCpuCount: 1,
    })

    expect(hardwareMemoryLabel(metrics)).toBe('1,024MB')
    expect(hardwareCpuLabel(metrics)).toBe('1')
  })
})
