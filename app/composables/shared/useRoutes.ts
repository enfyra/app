export function useRoutes() {
  const routes = useState<any[]>('routes:all', () => [])
  const tableRoutesMap = useState<Record<string, string>>('routes:table:map', () => ({}))
  
  const {
    data: routesData,
    execute: executeRoutes
  } = useApi(() => '/route_definition', {
    query: {
      fields: ['*', 'mainTable.*'].join(','),
      limit: 0,
      sort: 'path'
    },
    errorContext: 'Fetch Routes',
    immediate: false
  })
  
  async function loadRoutes() {
    await executeRoutes()
    const allRoutes = routesData.value?.data || []
    
    const mapping: Record<string, string> = {}
    for (const route of allRoutes) {
      if (route.mainTable?.id) {
        mapping[route.mainTable.id] = route.path
      }
    }
    
    routes.value = allRoutes
    tableRoutesMap.value = mapping
    
    return allRoutes
  }
  
  function getRouteForTableId(tableId: string | number): string {
    const id = String(tableId)
    if (tableRoutesMap.value[id]) {
      return tableRoutesMap.value[id]
    }
    
    const { schemas } = useSchema()
    const table = Object.values(schemas.value).find(
      (schema: any) => String(schema.id) === id
    )
    
    return table?.name ? `/${table.name}` : `/${id}`
  }
  
  function getRouteForTableName(tableName: string): string {
    const { schemas } = useSchema()
    const table = schemas.value[tableName]
    
    if (table?.id) {
      return getRouteForTableId(table.id)
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
    loadRoutes,
    ensureRoutesLoaded,
    getRouteForTableId,
    getRouteForTableName
  }
}