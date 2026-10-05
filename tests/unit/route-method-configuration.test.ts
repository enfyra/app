import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRouteMethodAvailability } from '../../app/composables/route/useRouteMethodAvailability'
import { getRouteMethodConfigFieldMap, getRouteMethodFileFieldMap, routeMethodConfigSections } from '../../app/utils/route-method-config-forms'

const { executeWithResult, refresh, createApi } = vi.hoisted(() => ({ executeWithResult: vi.fn(), refresh: vi.fn(), createApi: vi.fn() }))
vi.mock('../../app/composables/shared/useDatabase', () => ({
  useDatabase: () => ({ getId: (record: Record<string, any>) => record.id ?? record._id }),
}))
vi.mock('../../app/composables/shared/useApi', () => ({
  useApi: (...args: unknown[]) => {
    createApi(...args)
    return { executeWithResult }
  },
}))

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function setup(canUpdate = true, isSaving = false) {
  return useRouteMethodAvailability({ canUpdate: () => canUpdate, isSaving: () => isSaving, refresh })
}

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('route method quick availability', () => {
  it('updates only availability and refreshes persisted state', async () => {
    executeWithResult.mockResolvedValue({ ok: true })
    const { toggleMethodAvailability, togglingMethodConfigId } = setup()
    const config = { id: 658, available: true, isPublic: true, skipRoleGuard: false }

    await toggleMethodAvailability(config, false)

    expect(createApi).toHaveBeenCalledWith('/enfyra_route_method_config', { method: 'patch', errorContext: 'Update Route Method' })
    expect(executeWithResult).toHaveBeenCalledWith({ id: 658, body: { available: false } })
    expect(refresh).toHaveBeenCalledOnce()
    expect(config).toEqual({ id: 658, available: true, isPublic: true, skipRoleGuard: false })
    expect(togglingMethodConfigId.value).toBeNull()
  })

  it('serializes toggles and keeps row loading until refresh completes', async () => {
    let finishWrite!: (value: { ok: boolean }) => void
    let finishRefresh!: () => void
    executeWithResult.mockImplementationOnce(() => new Promise(resolve => { finishWrite = resolve }))
    refresh.mockImplementationOnce(() => new Promise<void>(resolve => { finishRefresh = resolve }))
    const { toggleMethodAvailability, togglingMethodConfigId } = setup()

    const first = toggleMethodAvailability({ id: 658, available: true }, false)
    expect(togglingMethodConfigId.value).toBe('658')
    await toggleMethodAvailability({ id: 659, available: false }, true)
    expect(executeWithResult).toHaveBeenCalledOnce()

    finishWrite({ ok: true })
    await Promise.resolve()
    expect(togglingMethodConfigId.value).toBe('658')
    finishRefresh()
    await first
    expect(togglingMethodConfigId.value).toBeNull()
  })

  it('does not mutate local state on failure and releases the lock', async () => {
    executeWithResult.mockResolvedValue({ ok: false })
    const { toggleMethodAvailability, togglingMethodConfigId } = setup()
    const config = { _id: 'method-post', available: false }

    await toggleMethodAvailability(config, true)

    expect(executeWithResult).toHaveBeenCalledWith({ id: 'method-post', body: { available: true } })
    expect(config.available).toBe(false)
    expect(refresh).not.toHaveBeenCalled()
    expect(togglingMethodConfigId.value).toBeNull()
  })

  it('rejects unauthorized, concurrent save, invalid and unchanged updates', async () => {
    await setup(false).toggleMethodAvailability({ id: 1, available: true }, false)
    await setup(true, true).toggleMethodAvailability({ id: 1, available: true }, false)
    const { toggleMethodAvailability } = setup()
    await toggleMethodAvailability({ available: true }, false)
    await toggleMethodAvailability({ id: 1, available: true }, true)
    expect(executeWithResult).not.toHaveBeenCalled()
  })
})

describe('route method settings presentation', () => {
  const panel = readFileSync(join(appDir, 'components/route/EditorPanel.vue'), 'utf8')

  it('uses clickable rows with a chevron instead of a Configure button', () => {
    expect(panel).toContain('@row-click="openMethodConfig"')
    expect(panel).toContain('name="lucide:chevron-right"')
    expect(panel).not.toContain('label="Configure"')
  })

  it('keeps the quick toggle separate from the row action', () => {
    const cell = panel.match(/<template #status-cell[\s\S]*?<\/template>/)?.[0]
    expect(cell).toContain('<USwitch')
    expect(cell).toContain('@click.stop')
    expect(cell).toContain('@keydown.stop')
    expect(cell).toContain('toggleMethodAvailability(row.original, value)')
    expect(cell).toContain(':loading=')
  })

  it('calls timeout by its actual field name', () => {
    expect(panel).toContain("header: 'Timeout'")
    const fields = getRouteMethodConfigFieldMap({ readonly: false, available: true, isPublic: false, multipartAllowed: true })
    expect(fields.timeout.label).toBe('Timeout (ms)')
    expect(panel).not.toMatch(/code budget/i)
  })

  it('uses the shared panel and keeps embedded collection routes unframed', () => {
    const collection = readFileSync(join(appDir, 'pages/collections/[table].vue'), 'utf8')
    expect(panel).toContain('<CommonPanel')
    expect(panel).toContain(':sections="editorSections"')
    expect(panel).toContain(':framed="!props.embedded"')
    expect(panel).toContain('embedded: false')
    expect(collection).toContain(':embedded="true"')
    expect(panel).not.toContain('route-editor-navigation')
    expect(collection).toContain('<CommonPanel')
    expect(collection).toContain('class="collection-route-panel"')
    expect(collection).not.toContain('class="collection-route-panel border-t')
  })

  it('uses native eApp form sections and renderers', () => {
    expect(panel).toContain('v-model="methodConfigForm"')
    expect(panel).toContain(':sections="methodConfigSections"')
    expect(panel).toContain(':field-map="methodConfigFieldMap"')
    expect(panel).toContain(':field-map="methodFileFieldMap"')
    expect(panel).not.toContain('method-settings-row')
    expect(panel).not.toContain('Total time available to the dynamic execution batch.')
    expect(panel).not.toContain('Configuration #')
    expect(routeMethodConfigSections.map(section => section.id)).toEqual(['access', 'execution', 'request-body'])
  })

  it('keeps access dependencies and multipart eligibility in field configuration', () => {
    const fields = getRouteMethodConfigFieldMap({ readonly: false, available: true, isPublic: true, multipartAllowed: false })
    expect(fields.available.disabled).toBe(false)
    expect(fields.skipRoleGuard.disabled).toBe(true)
    expect(fields.requestBodyType.options.find(option => option.value === 'multipart')?.disabled).toBe(true)
    expect(fields.requestBodyType.type).toBe('enum')
    expect(fields.maxFiles.type).toBe('int')
    expect(getRouteMethodFileFieldMap(false).allowedMimeTypes.type).toBe('array-tags')
    const readonly = getRouteMethodConfigFieldMap({ readonly: true, available: true, isPublic: false, multipartAllowed: true })
    expect(Object.values(readonly).every(field => field.disabled)).toBe(true)
  })
})
