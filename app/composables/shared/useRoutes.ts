import type { SchemaCollection } from '~/types/database';
import type { RecordListResponse, RouteCatalogEntry } from '~/types/global-state';

let loadRoutesPromise: Promise<RouteCatalogEntry[] | null> | null = null;

export function useRoutes() {
  const routes = useState<RouteCatalogEntry[]>('routes:all', () => [])
  const tableRoutesMap = useState<Record<string, string>>('routes:table:map', () => ({}))
  const routesLoading = useState<boolean>('routes:loading', () => false)
  const routesFetched = useState<boolean>('routes:fetched', () => false)
  const { getId } = useDatabase();
  const {
    data: routesData,
    execute: executeRoutes
  } = useApi<RecordListResponse<RouteCatalogEntry>>(() => '/enfyra_route', {
    query: {
      fields: ['id', 'path', 'isEnabled', 'updatedAt', 'mainTable.id', 'mainTable.name', 'mainTable.isSystem', 'mainTable.alias', 'mainTable.description', 'mainTable.isSingleRecord'].join(','),
      limit: 0,
      sort: 'path'
    },
    errorContext: 'Fetch Routes',
    immediate: false
  })
  
  async function loadRoutes() {
    if (loadRoutesPromise) return loadRoutesPromise

    loadRoutesPromise = (async () => {
      routesLoading.value = true
      try {
        const response = await executeRoutes()
        if (!response) return null
        const allRoutes = routesData.value?.data || []
        
        const mapping: Record<string, string> = {}
        for (const route of allRoutes) {
          const tableId = getId(route.mainTable);
          if (tableId) {
            mapping[tableId] = route.path
          }
        }
        
        routes.value = allRoutes
        tableRoutesMap.value = mapping
        routesFetched.value = true
        
        return allRoutes
      } finally {
        routesLoading.value = false
        loadRoutesPromise = null
      }
    })()

    return loadRoutesPromise
  }
  
  function getRouteForTableId(tableId: string | number, schemas?: SchemaCollection): string {
    const id = String(tableId)
    if (tableRoutesMap.value[id]) {
      return tableRoutesMap.value[id]
    }
    
    if (schemas) {
      const table = Object.values(schemas).find(
        schema => {
          const schemaId = getId(schema);
          return schemaId === id;
        }
      )
      
      return table?.name ? `/${table.name}` : `/${id}`
    }
    
    return `/${id}`
  }
  
  function getRouteForTableName(tableName: string, schemas?: SchemaCollection): string {
    if (schemas && schemas[tableName]) {
      const table = schemas[tableName]
      const tableId = getId(table);
      if (tableId) {
        return getRouteForTableId(tableId, schemas)
      }
    }
    
    return `/${tableName}`
  }
  
  function ensureRoutesLoaded() {
    if (routes.value.length === 0) {
      return loadRoutes()
    }
    return Promise.resolve(routes.value)
  }
  
  return {
    routes: readonly(routes),
    routesLoading: readonly(routesLoading),
    routesFetched: readonly(routesFetched),
    loadRoutes,
    ensureRoutesLoaded,
    getRouteForTableId,
    getRouteForTableName
  }
}
