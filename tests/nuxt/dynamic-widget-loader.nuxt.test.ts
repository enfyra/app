import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDynamicWidgetLoader } from '~/composables/dynamic/widgets'
import { useDynamicComponent } from '~/composables/dynamic/useDynamicComponent'
import { EXTENSION_RUNTIME_FIELDS } from '~/utils/extension-fields'

describe('dynamic widget loader', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('$fetch', vi.fn())
    useState<Map<string, any>>('extension-meta-cache', () => new Map()).value.clear()
    useDynamicComponent().clearCache()
  })

  it('batch fetches widget metadata requested in the same tick', async () => {
    const fetchMock = vi.mocked($fetch)
    fetchMock.mockResolvedValue({
      data: [
        {
          id: 1,
          extensionId: 'widget-one',
          updatedAt: '2026-05-19T00:00:00.000Z',
          compiledCode: 'window.widget-one = {}',
          description: null,
          isEnabled: true,
          isSystem: false,
          name: 'Widget One',
          type: 'widget',
          version: '1.0.0',
          createdAt: '2026-05-19T00:00:00.000Z',
        },
        {
          id: 2,
          extensionId: 'widget-two',
          updatedAt: '2026-05-19T00:00:00.000Z',
          compiledCode: 'window.widget-two = {}',
          description: null,
          isEnabled: true,
          isSystem: false,
          name: 'Widget Two',
          type: 'widget',
          version: '1.0.0',
          createdAt: '2026-05-19T00:00:00.000Z',
        },
      ],
    } as any)

    const { loadWidgetExtension } = useDynamicWidgetLoader()
    const [first, second, duplicate] = await Promise.all([
      loadWidgetExtension(1),
      loadWidgetExtension(2),
      loadWidgetExtension(1),
    ])

    expect(first?.extensionId).toBe('widget-one')
    expect(second?.extensionId).toBe('widget-two')
    expect(duplicate?.extensionId).toBe('widget-one')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/enfyra_extension', {
      query: {
        fields: EXTENSION_RUNTIME_FIELDS,
        filter: {
          _and: [
            { id: { _in: [1, 2] } },
            { isEnabled: { _eq: true } },
            { type: { _eq: 'widget' } },
          ],
        },
      },
    })
  })

  it('serves subsequent widget metadata requests from cache', async () => {
    const fetchMock = vi.mocked($fetch)
    fetchMock.mockResolvedValue({
      data: [
        {
          id: 3,
          extensionId: 'cached-widget',
          updatedAt: '2026-05-19T00:00:00.000Z',
          compiledCode: 'window.cached-widget = {}',
          description: null,
          isEnabled: true,
          isSystem: false,
          name: 'Cached Widget',
          type: 'widget',
          version: '1.0.0',
          createdAt: '2026-05-19T00:00:00.000Z',
        },
      ],
    } as any)

    const { loadWidgetExtension } = useDynamicWidgetLoader()
    await loadWidgetExtension(3)
    const cached = await loadWidgetExtension(3)

    expect(cached?.extensionId).toBe('cached-widget')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
