import type { RouteMethodAvailabilityOptions } from '~/types/route-method-config'

export function useRouteMethodAvailability(options: RouteMethodAvailabilityOptions) {
  const { getId } = useDatabase()
  const { executeWithResult } = useApi('/enfyra_route_method_config', {
    method: 'patch',
    errorContext: 'Update Route Method',
  })
  const togglingMethodConfigId = ref<string | null>(null)

  async function toggleMethodAvailability(config: Record<string, any>, available: boolean) {
    if (!options.canUpdate() || options.isSaving() || togglingMethodConfigId.value !== null) return
    const id = getId(config)
    if (id == null || available === (config.available === true)) return

    togglingMethodConfigId.value = String(id)
    try {
      const result = await executeWithResult({ id, body: { available } })
      if (result.ok) await options.refresh()
    } finally {
      togglingMethodConfigId.value = null
    }
  }

  return { togglingMethodConfigId, toggleMethodAvailability }
}
