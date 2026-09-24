import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  getGuardFilterFields,
  guardFormSections,
  normalizeGuardTargetPayload,
} from '../../app/utils/guard-forms'
import {
  buildGuardBodyFromTemplate,
  getGuardTemplatesForScope,
} from '../../app/utils/guard-templates'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function readAppFile(path: string) {
  return readFileSync(join(appDir, path), 'utf8')
}

describe('guard target UI contract', () => {
  it('normalizes GraphQL guards without hidden REST targeting state', () => {
    expect(normalizeGuardTargetPayload({
      type: 'graphql',
      isGlobal: true,
      route: { id: 10 },
      methods: [{ name: 'POST' }],
      table: { id: 20 },
      gqlOperation: 'CREATE',
    })).toMatchObject({
      type: 'graphql',
      isGlobal: false,
      route: null,
      methods: [],
      table: { id: 20 },
      gqlOperation: 'CREATE',
    })
  })

  it('normalizes route guards without hidden GraphQL targeting state', () => {
    expect(normalizeGuardTargetPayload({
      type: 'route',
      isGlobal: true,
      route: { id: 10 },
      methods: [{ name: 'POST' }],
      table: { id: 20 },
      gqlOperation: 'CREATE',
    })).toMatchObject({
      type: 'route',
      isGlobal: true,
      route: null,
      methods: [],
      table: null,
      gqlOperation: null,
    })
  })

  it('clears excludeRoutes unless the guard is a global root guard', () => {
    expect(normalizeGuardTargetPayload({
      type: 'route',
      isGlobal: true,
      route: { id: 10 },
      methods: [{ name: 'POST' }],
      excludeRoutes: [{ id: 3 }],
    })).toMatchObject({
      type: 'route',
      isGlobal: true,
      route: null,
      methods: [],
      excludeRoutes: [{ id: 3 }],
    })

    expect(normalizeGuardTargetPayload({
      type: 'route',
      isGlobal: false,
      route: { id: 10 },
      excludeRoutes: [{ id: 3 }],
    })).toMatchObject({
      type: 'route',
      isGlobal: false,
      route: { id: 10 },
      excludeRoutes: [],
    })

    expect(normalizeGuardTargetPayload({
      type: 'graphql',
      excludeRoutes: [{ id: 3 }],
    })).toMatchObject({
      type: 'graphql',
      isGlobal: false,
      excludeRoutes: [],
    })
  })

  it('places target selection before evaluation behavior', () => {
    expect(guardFormSections.map((section) => section.id)).toEqual([
      'details',
      'target',
      'evaluation',
    ])
    expect(guardFormSections[1]?.fields).toContain('type')
    expect(guardFormSections[2]?.fields).toContain('position')
  })

  it('exposes only target-relevant fields in each filter drawer', () => {
    const routeFields = getGuardFilterFields('route')
    const graphqlFields = getGuardFilterFields('graphql')

    expect(routeFields).toEqual(expect.arrayContaining(['route', 'methods', 'isGlobal']))
    expect(routeFields).not.toEqual(expect.arrayContaining(['table', 'gqlOperation']))
    expect(graphqlFields).toEqual(expect.arrayContaining(['table', 'gqlOperation']))
    expect(graphqlFields).not.toEqual(expect.arrayContaining(['route', 'methods', 'isGlobal']))
  })

  it('builds the GraphQL quick template with the server contract', () => {
    const [template] = getGuardTemplatesForScope('graphql')
    expect(template?.ruleType).toBe('rate_limit_by_operation')
    expect(buildGuardBodyFromTemplate(template!, {
      scope: 'graphql',
      idField: 'id',
      tableId: '12',
      gqlOperation: 'QUERY',
    })).toMatchObject({
      type: 'graphql',
      isGlobal: false,
      table: { id: '12' },
      gqlOperation: 'QUERY',
    })
  })

  it('uses filtered totals and target-specific list copy', () => {
    const guardList = readAppFile('pages/settings/guards/index.vue')

    expect(guardList).toContain("apiData.value?.meta?.filterCount")
    expect(guardList).toContain("activeType.value === 'graphql'")
    expect(guardList).toContain('No GraphQL guards found')
    expect(guardList.match(/:skeleton-rows="4"/g)).toHaveLength(1)
    expect(guardList).not.toContain(':loading="guardsRefreshing"')
    expect(guardList).toContain('guard-list-stage grid min-h-[22rem]')
    expect(guardList).toContain(':key="listStateKey"')
    expect(guardList).toContain('@update:model-value="handleTypeChange"')
    expect(guardList).not.toContain('v-model="activeType"')
    expect(guardList).toContain('isRefreshing: guardsRefreshing')
    expect(guardList).toContain('const isPageLoading = computed(() => showInitialLoading.value || isListLoading.value);')
    expect(guardList).toContain('v-if="isPageLoading" class="mt-2 h-8 w-12"')
    expect(guardList).not.toContain('v-if="showInitialLoading" key="loading"')
    expect(guardList).toContain(':css="!suppressListTransition"')
    expect(guardList).toContain('filtersByType')
    expect(guardList).toContain(':allowed-fields="activeFilterFields"')
    expect(guardList).toContain(':history-key="`enfyra_guard:${activeType}`"')
    expect(guardList).not.toContain('const activeScope =')
  })

  it('hides REST-only scope and isolates saved filter history for GraphQL', () => {
    for (const path of [
      'pages/settings/guards/create.vue',
      'pages/settings/guards/[id].vue',
    ]) {
      const source = readAppFile(path)
      const start = source.indexOf('isGlobal: {')
      const end = source.indexOf('gqlOperation:', start)
      expect(source.slice(start, end)).toContain('excluded: isGraphqlGuardForm.value')
    }

    const filterDrawer = readAppFile('components/filter/Drawer.vue')
    expect(filterDrawer).toContain('<FilterPreview')
    expect(filterDrawer).toContain(':table-name="tableName"')
    expect(filterDrawer).toContain('<FilterSavedFilters')
    expect(filterDrawer).toContain(':table-name="historyKey || tableName"')
  })

  it('hides targeting fields from sub-guard drawers', () => {
    // A sub-guard only carries name/description/combinator/priority/isEnabled:
    // it inherits route, position, and methods from its root, its `type` is never
    // read for classification, and excludeRoutes is rejected on a child guard.
    const targetingFields = [
      'route',
      'isGlobal',
      'position',
      'methods',
      'type',
      'gqlOperation',
      'table',
      'excludeRoutes',
    ]

    for (const path of [
      'components/guard/CreateChildDrawer.vue',
      'components/guard/EditChildDrawer.vue',
    ]) {
      const source = readAppFile(path)
      const excluded = source.slice(source.indexOf(':excluded="['), source.indexOf(']"', source.indexOf(':excluded="[')))
      for (const field of targetingFields) {
        expect(excluded, `${path} must exclude ${field}`).toContain(`'${field}'`)
      }
    }
  })

  it('hides GraphQL-only and global-only fields from the route-editor guard drawer', () => {
    // This drawer always creates a route-attached root guard (route set by the
    // route editor, isGlobal forced false), so type/gqlOperation/table and
    // excludeRoutes would all be rejected by GuardValidationService.
    const source = readAppFile('components/guard/CreateForRouteDrawer.vue')
    const excluded = source.slice(source.indexOf(':excluded="['), source.indexOf(']"', source.indexOf(':excluded="[')))

    for (const field of ['type', 'gqlOperation', 'table', 'excludeRoutes', 'isGlobal', 'route']) {
      expect(excluded, `CreateForRouteDrawer must exclude ${field}`).toContain(`'${field}'`)
    }
    expect(excluded).not.toContain("'position'")
    expect(excluded).not.toContain("'methods'")
  })

  it('clears rule drawer dirty state when a successful save closes the drawer', () => {
    for (const path of [
      'components/guard/CreateRuleDrawer.vue',
      'components/guard/EditRuleDrawer.vue',
      'components/guard/CreateChildDrawer.vue',
      'components/guard/EditChildDrawer.vue',
      'components/guard/CreateForRouteDrawer.vue',
    ]) {
      const source = readAppFile(path)
      expect(source).toContain('watch(() => props.modelValue')
      expect(source).toContain('hasChanged.value = false')
      expect(source).toContain('showDiscardModal.value = false')
    }
  })
})
