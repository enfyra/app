<script setup lang="ts">
const props = defineProps<{
  tableName?: string
  routeId?: string
  externalApiTest?: boolean
  showMainTableCard?: boolean
  showEmptyState?: boolean
  canUpdateRoute?: boolean
  syncQuery?: boolean
}>()

const emit = defineEmits<{
  'close-api-test': []
}>()

const notify = useNotify()
const { confirm } = useConfirm()
const { getId, getIdFieldName } = useDatabase()
const idField = getIdFieldName()
const currentPageRoute = useRoute()
const router = useRouter()
const { loadRoutes } = useRoutes()
const { schemas } = useSchema()
const { getIncludeFields: getRouteIncludeFields } = useSchema('route_definition')
const { getIncludeFields: getPreHookIncludeFields } = useSchema('pre_hook_definition')
const { getIncludeFields: getPostHookIncludeFields } = useSchema('post_hook_definition')
const { getIncludeFields: getHandlerIncludeFields } = useSchema('route_handler_definition')
const { generateEmptyForm: generateHandlerEmptyForm, validate: validateHandler } = useSchema('route_handler_definition')
const { generateEmptyForm: generatePreHookEmptyForm, validate: validatePreHook } = useSchema('pre_hook_definition')
const { generateEmptyForm: generatePostHookEmptyForm, validate: validatePostHook } = useSchema('post_hook_definition')

const routeId = ref<string | undefined>(props.routeId)

const {
  data: routeData,
  pending: routeLoading,
  execute: fetchRoute,
} = useApi(() => '/route_definition', {
  query: computed(() => ({
    fields: getRouteIncludeFields(),
    filter: props.routeId
      ? { [getIdFieldName()]: { _eq: props.routeId } }
      : props.tableName
        ? { mainTable: { name: { _eq: props.tableName } } }
        : undefined,
  })),
  errorContext: 'Fetch Route',
})

const availableMethodStrings = computed(() => {
  const methods = routeData.value?.data?.[0]?.availableMethods
  if (!Array.isArray(methods)) return []
  return methods.filter((m: any) => m?.method).map((m: any) => m.method)
})

const publishedMethodStrings = computed(() => {
  const methods = routeData.value?.data?.[0]?.publishedMethods
  if (!Array.isArray(methods)) return []
  return methods.filter((m: any) => m?.method).map((m: any) => m.method)
})

const { validateForm } = useFormValidation('route_definition')
const formEditorRef = ref()
const form = ref<Record<string, any>>({})
const errors = ref<Record<string, string>>({})
const hasFormChanges = ref(false)
const { useFormChanges } = useSchema()
const formChanges = useFormChanges()

const typeMap = ref<Record<string, any>>({})

const {
  error: updateRouteError,
  execute: executeUpdateRoute,
  pending: updateLoading,
} = useApi(() => '/route_definition', {
  method: 'patch',
  errorContext: 'Update Route',
})

function filterPublishedToAvailable(body: Record<string, any>) {
  const available = body.availableMethods || []
  const availableSet = new Set(available.filter((m: any) => m?.method).map((m: any) => m.method))
  for (const key of ['publishedMethods', 'skipRoleGuardMethods'] as const) {
    if (Array.isArray(body[key])) {
      body[key] = availableSet.size > 0
        ? body[key].filter((m: any) => m?.method && availableSet.has(m.method))
        : []
    }
  }
  for (const key of ['availableMethods', 'publishedMethods', 'skipRoleGuardMethods'] as const) {
    if (Array.isArray(body[key])) {
      body[key] = body[key]
        .map((m: any) => {
          const id = getId(m)
          return id != null ? { id, method: m.method } : null
        })
        .filter(Boolean)
    }
  }
}

async function initializeForm() {
  const data = routeData.value?.data?.[0]
  if (data) {
    form.value = { ...data }
    formChanges.update(data)
    hasFormChanges.value = false
  }
}

async function updateRoute() {
  if (!form.value || !routeId.value) return

  const body = { ...form.value }
  filterPublishedToAvailable(body)

  if (!await validateForm(body, errors)) return

  await executeUpdateRoute({ id: routeId.value, body })

  if (updateRouteError.value) return

  notify.success("Success", "Route updated!")
  errors.value = {}
  hasFormChanges.value = false

  const { registerDataMenuItems } = useMenuRegistry()
  await loadRoutes()
  await registerDataMenuItems(Object.values(schemas.value))

  await fetchRoute()
  const freshData = routeData.value?.data?.[0]
  if (freshData) {
    form.value = { ...freshData }
    formChanges.update(freshData)
  }

  formEditorRef.value?.confirmChanges()
}

async function handleReset() {
  const ok = await confirm({
    title: 'Reset Changes',
    content: 'Are you sure you want to discard all changes?',
  })
  if (!ok) return

  if (formChanges.originalData.value) {
    form.value = formChanges.discardChanges(form.value)
    hasFormChanges.value = false
    notify.success("Reset Complete", "All changes have been discarded.")
  }
}

const {
  data: handlersData,
  pending: handlersLoading,
  execute: fetchHandlers,
} = useApi(() => '/route_handler_definition', {
  query: computed(() => ({
    fields: getHandlerIncludeFields(),
    filter: routeId.value ? { route: { [getIdFieldName()]: { _eq: routeId.value } } } : undefined,
  })),
  errorContext: 'Fetch Handlers',
  immediate: false,
})

const {
  data: preHooksData,
  pending: preHooksLoading,
  execute: fetchPreHooks,
} = useApi(() => '/pre_hook_definition', {
  query: computed(() => ({
    fields: getPreHookIncludeFields(),
    filter: routeId.value ? { route: { [getIdFieldName()]: { _eq: routeId.value } } } : undefined,
    sort: ['priority'],
  })),
  errorContext: 'Fetch Pre-Hooks',
  immediate: false,
})

const {
  data: postHooksData,
  pending: postHooksLoading,
  execute: fetchPostHooks,
} = useApi(() => '/post_hook_definition', {
  query: computed(() => ({
    fields: getPostHookIncludeFields(),
    filter: routeId.value ? { route: { [getIdFieldName()]: { _eq: routeId.value } } } : undefined,
    sort: ['priority'],
  })),
  errorContext: 'Fetch Post-Hooks',
  immediate: false,
})

const {
  data: globalPreHooksData,
  pending: globalPreHooksLoading,
  execute: fetchGlobalPreHooks,
} = useApi(() => '/pre_hook_definition', {
  query: computed(() => ({
    fields: getPreHookIncludeFields(),
    filter: { isGlobal: { _eq: true } },
    sort: ['priority'],
  })),
  errorContext: 'Fetch Global Pre-Hooks',
  immediate: false,
})

const {
  data: globalPostHooksData,
  pending: globalPostHooksLoading,
  execute: fetchGlobalPostHooks,
} = useApi(() => '/post_hook_definition', {
  query: computed(() => ({
    fields: getPostHookIncludeFields(),
    filter: { isGlobal: { _eq: true } },
    sort: ['priority'],
  })),
  errorContext: 'Fetch Global Post-Hooks',
  immediate: false,
})

const handlers = computed(() => handlersData.value?.data || [])
const handlerOccupiedMethods = computed(() => {
  const set = new Set<string>()
  for (const h of handlers.value as any[]) {
    const m = h?.method?.method
    if (m) set.add(m)
  }
  return set
})
const handlerAvailableMethods = computed(() =>
  availableMethodStrings.value.filter((m: string) => !handlerOccupiedMethods.value.has(m))
)
const canCreateHandler = computed(() => handlerAvailableMethods.value.length > 0)
const routePreHooks = computed(() => preHooksData.value?.data || [])
const routePostHooks = computed(() => postHooksData.value?.data || [])
const globalPreHooks = computed(() => globalPreHooksData.value?.data || [])
const globalPostHooks = computed(() => globalPostHooksData.value?.data || [])

const preHooks = computed(() => [...routePreHooks.value, ...globalPreHooks.value])
const postHooks = computed(() => [...routePostHooks.value, ...globalPostHooks.value])

const sortedPreHooks = computed(() =>
  [...preHooks.value].sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0))
)
const sortedAfterHooks = computed(() =>
  [...postHooks.value].sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0))
)

const mainTableInfo = computed(() => {
  const data = routeData.value?.data?.[0]
  if (props.tableName) return schemas.value?.[props.tableName] || data?.mainTable || null
  if (!data?.mainTable) return null

  const mainTableId = getId(data.mainTable)
  if (!mainTableId) return data.mainTable

  return Object.values(schemas.value).find((schema: any) => String(getId(schema)) === String(mainTableId)) || data.mainTable
})

const mainTableName = computed(() => mainTableInfo.value?.name || props.tableName)

const defaultHandler = computed(() => {
  if (!mainTableName.value || handlers.value.length > 0) return null
  return {
    _isDefault: true,
    name: 'Built-in logic',
    description: `Built-in CRUD logic for ${mainTableName.value}.`,
  }
})

const displayHandlers = computed(() => {
  if (defaultHandler.value) return [defaultHandler.value]
  return handlers.value
})

function getPreHookPriority(hook: any): number | null {
  return hook.priority ?? null
}

function getAfterHookPriority(hook: any): number | null {
  return hook.priority ?? null
}

const mainTableColumns = computed(() => {
  const tableSchema = mainTableName.value ? schemas.value?.[mainTableName.value] : null
  if (!tableSchema) return []
  const cols = tableSchema.columns || tableSchema.fields || []
  return cols.map((c: any) => c.name || c.propertyName).filter(Boolean)
})

async function refreshAll() {
  await Promise.all([
    fetchHandlers(),
    fetchPreHooks(),
    fetchPostHooks(),
    fetchGlobalPreHooks(),
    fetchGlobalPostHooks(),
    fetchRouteGuards(),
    fetchGlobalGuards(),
  ])
}

watch(() => routeData.value?.data?.[0], async (newRoute) => {
  if (newRoute) {
    routeId.value = String(getId(newRoute))
    form.value = { ...newRoute }
    formChanges.update(newRoute)

    typeMap.value = {
      isEnabled: {
        disabled: !!mainTableInfo.value,
      },
      publishedMethods: {
        type: 'methods-selector',
        allowedMethodsKey: 'availableMethods'
      },
      skipRoleGuardMethods: {
        type: 'methods-selector',
        allowedMethodsKey: 'availableMethods'
      },
      availableMethods: {
        type: 'methods-selector'
      }
    }

    await refreshAll()
  }
}, { immediate: true })

watch(() => props.routeId, async (newRouteId) => {
  routeId.value = newRouteId
  await fetchRoute()
})

onMounted(async () => {
  await fetchRoute()
})

// --- Handler CRUD ---

const methodsCache = useState<any[]>('methods-cache', () => [])

function resolveMethodObject(methodStr: string): { method: string; id?: string } {
  const cached = methodsCache.value.find((m: any) => m?.method === methodStr)
  if (cached) {
    const id = getId(cached)
    return id != null ? { id, method: methodStr } : { method: methodStr }
  }
  return { method: methodStr }
}

const handlerLockedMethod = ref(false)
const hookLockedMethod = ref(false)
const hookFromInsertButton = ref(false)

const showCreateHandlerDrawer = ref(false)
const handlerForm = ref<Record<string, any>>({})
const handlerErrors = ref<Record<string, string>>({})

const {
  error: createHandlerError,
  execute: executeCreateHandler,
  pending: createHandlerLoading,
} = useApi(() => '/route_handler_definition', {
  method: 'post',
  errorContext: 'Create Handler',
})

function createHandler(methodObject?: { method: string; id?: string }) {
  if (methodObject) {
    if (handlerOccupiedMethods.value.has(methodObject.method)) {
      notify.warning('Handler exists', `This route already has a handler for ${methodObject.method}.`)
      return
    }
  } else if (!canCreateHandler.value) {
    notify.warning('No methods available', 'All available methods already have handlers.')
    return
  }

  handlerForm.value = generateHandlerEmptyForm()
  handlerForm.value.route = { [idField]: routeId.value }
  if (methodObject) {
    const resolved = methodObject.id != null
      ? methodObject
      : resolveMethodObject(methodObject.method)
    handlerForm.value.method = resolved
    handlerLockedMethod.value = true
  } else {
    handlerLockedMethod.value = false
  }
  handlerErrors.value = {}
  showCreateHandlerDrawer.value = true
}

function handleCancelHandler() {
  showCreateHandlerDrawer.value = false
  handlerLockedMethod.value = false
}

async function saveHandler() {
  const { isValid, errors } = await validateRouteHandlerForm(handlerForm.value, validateHandler)
  if (!isValid) {
    handlerErrors.value = errors
    notify.error("Validation error", "Please check the fields with errors.")
    return
  }

  await executeCreateHandler({ body: handlerForm.value })
  if (createHandlerError.value) return

  showCreateHandlerDrawer.value = false
  handlerLockedMethod.value = false
  await fetchHandlers()
}

const showEditHandlerDrawer = ref(false)
const editHandlerForm = ref<Record<string, any>>({})
const editHandlerErrors = ref<Record<string, string>>({})
const editingHandlerId = ref<string | null>(null)

const {
  error: updateHandlerError,
  execute: executeUpdateHandler,
  pending: updateHandlerLoading,
} = useApi(() => '/route_handler_definition', {
  method: 'patch',
  errorContext: 'Update Handler',
})

const {
  data: editHandlerData,
  execute: fetchEditHandler,
} = useApi(() => '/route_handler_definition', {
  query: computed(() => ({
    fields: getHandlerIncludeFields(),
    filter: { [getIdFieldName()]: { _eq: editingHandlerId.value } },
  })),
  errorContext: 'Fetch Handler',
  immediate: false,
})

watch(editHandlerData, (data) => {
  if (data?.data?.[0]) {
    editHandlerForm.value = { ...data.data[0] }
    editHandlerForm.value.route = { [idField]: routeId.value }
  }
})

async function editHandler(handler: any) {
  if (handler._isDefault) {
    createHandler(handler._methodObject)
    return
  }
  editingHandlerId.value = getId(handler)
  editHandlerErrors.value = {}
  await fetchEditHandler()
  editHandlerForm.value.route = { [idField]: routeId.value }
  showEditHandlerDrawer.value = true
}

function handleCancelEditHandler() {
  showEditHandlerDrawer.value = false
}

async function updateHandler() {
  if (!editingHandlerId.value || !editHandlerForm.value) return
  const { isValid, errors } = await validateRouteHandlerForm(editHandlerForm.value, validateHandler)
  if (!isValid) {
    editHandlerErrors.value = errors
    notify.error("Validation error", "Please check the fields with errors.")
    return
  }

  await executeUpdateHandler({ id: editingHandlerId.value, body: editHandlerForm.value })
  if (updateHandlerError.value) return

  showEditHandlerDrawer.value = false
  await fetchHandlers()
}

const { execute: deleteHandlerApi, error: deleteHandlerError } = useApi(() => '/route_handler_definition', {
  method: 'delete',
  errorContext: 'Delete Handler',
})

async function deleteHandler(handler: any) {
  const ok = await confirm({
    title: 'Delete Handler',
    content: `Are you sure you want to delete handler "${handler.name || 'Unnamed'}"?`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
  })
  if (!ok) return

  await deleteHandlerApi({ id: getId(handler) })
  if (deleteHandlerError.value) return

  notify.success("Success", "Handler deleted successfully")
  await fetchHandlers()
}

// --- Hook CRUD ---

const showCreateHookDrawer = ref(false)
const hookForm = ref<Record<string, any>>({})
const hookErrors = ref<Record<string, string>>({})
const hookType = ref<'pre' | 'post'>('pre')

const {
  error: createPreHookError,
  execute: executeCreatePreHook,
  pending: createPreHookLoading,
} = useApi(() => '/pre_hook_definition', { method: 'post', errorContext: 'Create Pre-Hook' })

const {
  error: createPostHookError,
  execute: executeCreatePostHook,
  pending: createPostHookLoading,
} = useApi(() => '/post_hook_definition', { method: 'post', errorContext: 'Create Post-Hook' })

const createHookLoading = computed(() => createPreHookLoading.value || createPostHookLoading.value)

function createHook(type?: 'pre' | 'post', method?: string, priority?: number) {
  hookType.value = type || 'pre'
  hookForm.value = hookType.value === 'pre' ? generatePreHookEmptyForm() : generatePostHookEmptyForm()
  hookForm.value.route = { [idField]: routeId.value }
  if (method) {
    hookForm.value.methods = [resolveMethodObject(method)]
    hookLockedMethod.value = true
  } else {
    hookLockedMethod.value = false
  }
  if (priority != null) {
    hookForm.value.priority = priority
    hookFromInsertButton.value = true
  } else {
    hookFromInsertButton.value = false
  }
  hookErrors.value = {}
  showCreateHookDrawer.value = true
}

function handleCancelHook() {
  showCreateHookDrawer.value = false
  hookLockedMethod.value = false
  hookFromInsertButton.value = false
}

async function saveHook() {
  const isPreHook = hookType.value === 'pre'
  const validate = isPreHook ? validatePreHook : validatePostHook
  const { isValid, errors } = await validateRouteHookForm(
    hookForm.value,
    validate,
    isPreHook ? 'pre' : 'post',
  )

  if (!isValid) {
    hookErrors.value = errors
    notify.error("Validation error", "Please check the fields with errors.")
    return
  }

  if (hookFromInsertButton.value) {
    const targetPriority = Number(hookForm.value.priority) || 0
    const localHooks = isPreHook ? routePreHooks.value : routePostHooks.value
    const toShift = localHooks
      .filter((h: any) => !h.isGlobal && (Number(h.priority) || 0) >= targetPriority)
      .sort((a: any, b: any) => (Number(b.priority) || 0) - (Number(a.priority) || 0))
    const patch = isPreHook ? executeUpdatePreHook : executeUpdatePostHook
    for (const h of toShift) {
      await patch({
        id: getId(h),
        body: { priority: (Number(h.priority) || 0) + 1 },
      })
    }
  }

  if (isPreHook) {
    await executeCreatePreHook({ body: hookForm.value })
    if (createPreHookError.value) return
  } else {
    await executeCreatePostHook({ body: hookForm.value })
    if (createPostHookError.value) return
  }

  showCreateHookDrawer.value = false
  hookLockedMethod.value = false
  hookFromInsertButton.value = false
  await refreshAll()
}

const showEditHookDrawer = ref(false)
const editHookForm = ref<Record<string, any>>({})
const editHookErrors = ref<Record<string, string>>({})
const editingHookId = ref<string | null>(null)
const editHookType = ref<'pre' | 'post'>('pre')

const {
  error: updatePreHookError,
  execute: executeUpdatePreHook,
  pending: updatePreHookLoading,
} = useApi(() => '/pre_hook_definition', { method: 'patch', errorContext: 'Update Pre-Hook' })

const {
  error: updatePostHookError,
  execute: executeUpdatePostHook,
  pending: updatePostHookLoading,
} = useApi(() => '/post_hook_definition', { method: 'patch', errorContext: 'Update Post-Hook' })

const updateHookLoading = computed(() => updatePreHookLoading.value || updatePostHookLoading.value)

const {
  data: editPreHookData,
  execute: fetchEditPreHook,
} = useApi(() => '/pre_hook_definition', {
  query: computed(() => ({
    fields: getPreHookIncludeFields(),
    filter: { [getIdFieldName()]: { _eq: editingHookId.value } },
  })),
  errorContext: 'Fetch Pre-Hook',
  immediate: false,
})

const {
  data: editPostHookData,
  execute: fetchEditPostHook,
} = useApi(() => '/post_hook_definition', {
  query: computed(() => ({
    fields: getPostHookIncludeFields(),
    filter: { [getIdFieldName()]: { _eq: editingHookId.value } },
  })),
  errorContext: 'Fetch Post-Hook',
  immediate: false,
})

async function editHook(hook: any) {
  const hookId = String(getId(hook))
  const type = hook._hookType as 'pre' | 'post'
  if (!type) return

  editingHookId.value = hookId
  editHookErrors.value = {}
  editHookType.value = type

  if (type === 'pre') {
    await fetchEditPreHook()
    if (editPreHookData.value?.data?.[0]) {
      editHookForm.value = { ...editPreHookData.value.data[0] }
      editHookForm.value.route = { [idField]: routeId.value }
      showEditHookDrawer.value = true
    }
  } else {
    await fetchEditPostHook()
    if (editPostHookData.value?.data?.[0]) {
      editHookForm.value = { ...editPostHookData.value.data[0] }
      editHookForm.value.route = { [idField]: routeId.value }
      showEditHookDrawer.value = true
    }
  }
}

function handleCancelEditHook() {
  showEditHookDrawer.value = false
}

async function updateHook() {
  if (!editingHookId.value || !editHookForm.value) return

  const isPreHook = editHookType.value === 'pre'
  const validate = isPreHook ? validatePreHook : validatePostHook
  const { isValid, errors } = await validateRouteHookForm(
    editHookForm.value,
    validate,
    isPreHook ? 'pre' : 'post',
  )

  if (!isValid) {
    editHookErrors.value = errors
    notify.error("Validation error", "Please check the fields with errors.")
    return
  }

  if (isPreHook) {
    await executeUpdatePreHook({ id: editingHookId.value, body: editHookForm.value })
  } else {
    await executeUpdatePostHook({ id: editingHookId.value, body: editHookForm.value })
  }

  const updateError = isPreHook ? updatePreHookError : updatePostHookError
  if (updateError.value) return

  showEditHookDrawer.value = false
  await refreshAll()
}

const { execute: togglePreHookApi, error: togglePreHookError } = useApi(() => '/pre_hook_definition', {
  method: 'patch',
  errorContext: 'Toggle Pre-Hook',
})

const { execute: togglePostHookApi, error: togglePostHookError } = useApi(() => '/post_hook_definition', {
  method: 'patch',
  errorContext: 'Toggle Post-Hook',
})

async function toggleHook(hook: any, enabled: boolean) {
  const originalEnabled = hook.isEnabled
  hook.isEnabled = enabled
  const isPreHook = hook._hookType === 'pre'
  const toggleApi = isPreHook ? togglePreHookApi : togglePostHookApi
  const toggleError = isPreHook ? togglePreHookError : togglePostHookError

  await toggleApi({ id: getId(hook), body: { isEnabled: enabled } })
  if (toggleError.value) {
    hook.isEnabled = originalEnabled
    return
  }

  notify.success('Success', `${isPreHook ? 'Pre' : 'Post'}-Hook ${enabled ? 'enabled' : 'disabled'} successfully`)
  await refreshAll()
}

const { execute: deletePreHookApi, error: deletePreHookError } = useApi(() => '/pre_hook_definition', {
  method: 'delete',
  errorContext: 'Delete Pre-Hook',
})

const { execute: deletePostHookApi, error: deletePostHookError } = useApi(() => '/post_hook_definition', {
  method: 'delete',
  errorContext: 'Delete Post-Hook',
})

async function deleteHook(hook: any) {
  const ok = await confirm({
    title: 'Delete Hook',
    content: `Are you sure you want to delete ${hook._hookType === 'pre' ? 'pre' : 'post'}-hook "${hook.name || 'Unnamed'}"?`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
  })
  if (!ok) return

  const isPreHook = hook._hookType === 'pre'
  const deleteApi = isPreHook ? deletePreHookApi : deletePostHookApi
  const deleteError = isPreHook ? deletePreHookError : deletePostHookError

  await deleteApi({ id: getId(hook) })
  if (deleteError.value) return

  notify.success('Success', `${isPreHook ? 'Pre' : 'Post'}-Hook deleted successfully`)
  await refreshAll()
}

// --- Guard Management ---

const {
  data: routeGuardsData,
  pending: routeGuardsLoading,
  execute: fetchRouteGuards,
} = useApi(() => '/guard_definition', {
  query: computed(() => ({
    fields: '*,route.id,route.path,methods.method,parent',
    filter: routeId.value
      ? { _and: [{ route: { [getIdFieldName()]: { _eq: routeId.value } } }, { parent: { _is_null: true } }] }
      : undefined,
    sort: ['priority'],
  })),
  errorContext: 'Fetch Route Guards',
  immediate: false,
})

const {
  data: globalGuardsData,
  pending: globalGuardsLoading,
  execute: fetchGlobalGuards,
} = useApi(() => '/guard_definition', {
  query: computed(() => ({
    fields: '*,route.id,route.path,methods.method,parent',
    filter: { _and: [{ isGlobal: { _eq: true } }, { parent: { _is_null: true } }] },
    sort: ['priority'],
  })),
  errorContext: 'Fetch Global Guards',
  immediate: false,
})

const routeGuards = computed(() => routeGuardsData.value?.data || [])
const globalGuards = computed(() => globalGuardsData.value?.data || [])
const guardsLoading = computed(() => routeGuardsLoading.value || globalGuardsLoading.value)

const showCreateGuardDrawer = ref(false)
const guardForm = ref<Record<string, any>>({})
const guardErrors = ref<Record<string, string>>({})

const {
  error: createGuardError,
  execute: executeCreateGuard,
  pending: createGuardLoading,
} = useApi(() => '/guard_definition', { method: 'post', errorContext: 'Create Guard' })

function openCreateGuardDrawer() {
  guardForm.value = {
    name: '',
    description: '',
    position: 'pre_auth',
    combinator: 'and',
    priority: 0,
    isEnabled: true,
    isGlobal: false,
    route: { [idField]: routeId.value },
  }
  guardErrors.value = {}
  showCreateGuardDrawer.value = true
}

async function saveGuard() {
  if (!guardForm.value.name || !guardForm.value.position) {
    notify.error("Validation Error", "Name and position are required")
    return
  }

  await executeCreateGuard({ body: guardForm.value })
  if (createGuardError.value) return

  notify.success("Guard created successfully")
  showCreateGuardDrawer.value = false
  await Promise.all([fetchRouteGuards(), fetchGlobalGuards()])
}

const showApiTestModal = ref(false)

watch(() => props.externalApiTest, (val) => {
  if (val) showApiTestModal.value = true
})

watch(showApiTestModal, (val) => {
  if (!val) emit('close-api-test')
})

const routePath = computed(() => routeData.value?.data?.[0]?.path || '')

function setSyncedQuery(patch: Record<string, string | undefined>) {
  if (!props.syncQuery) return
  const query = { ...currentPageRoute.query }
  for (const [key, value] of Object.entries(patch)) {
    if (value == null) delete query[key]
    else query[key] = value
  }
  router.replace({ query })
}

watch(() => currentPageRoute.query.createHandler, (value) => {
  if (!props.syncQuery) return
  const shouldOpen = value === 'true'
  if (shouldOpen && !showCreateHandlerDrawer.value) createHandler()
  if (!shouldOpen && showCreateHandlerDrawer.value) showCreateHandlerDrawer.value = false
}, { immediate: true })

watch(showCreateHandlerDrawer, (isOpen) => {
  setSyncedQuery({ createHandler: isOpen ? 'true' : undefined })
})

watch(() => currentPageRoute.query.editHandler, async (value) => {
  if (!props.syncQuery) return
  if (typeof value === 'string' && value && value !== editingHandlerId.value) {
    editingHandlerId.value = value
    editHandlerErrors.value = {}
    await fetchEditHandler()
    showEditHandlerDrawer.value = true
    return
  }
  if (!value && showEditHandlerDrawer.value) {
    showEditHandlerDrawer.value = false
    editingHandlerId.value = null
    editHandlerForm.value = {}
    editHandlerErrors.value = {}
  }
}, { immediate: true })

watch(showEditHandlerDrawer, (isOpen) => {
  setSyncedQuery({ editHandler: isOpen && editingHandlerId.value ? editingHandlerId.value : undefined })
})

watch(() => currentPageRoute.query.createHook, (value) => {
  if (!props.syncQuery) return
  const shouldOpen = value === 'true' || value === 'pre' || value === 'post'
  if (shouldOpen && !showCreateHookDrawer.value) createHook(value === 'post' ? 'post' : 'pre')
  if (!shouldOpen && showCreateHookDrawer.value) showCreateHookDrawer.value = false
}, { immediate: true })

watch(showCreateHookDrawer, (isOpen) => {
  setSyncedQuery({ createHook: isOpen ? hookType.value || 'pre' : undefined })
})

watch(() => [currentPageRoute.query.editHook, currentPageRoute.query.editHookType], async ([hookId, hookTypeParam]) => {
  if (!props.syncQuery) return
  if (typeof hookId === 'string' && hookId) {
    const nextType = hookTypeParam === 'post' ? 'post' : 'pre'
    if (hookId === editingHookId.value && nextType === editHookType.value && showEditHookDrawer.value) return
    editingHookId.value = hookId
    editHookType.value = nextType
    editHookErrors.value = {}
    if (nextType === 'pre') {
      await fetchEditPreHook()
      if (editPreHookData.value?.data?.[0]) {
        editHookForm.value = { ...editPreHookData.value.data[0], route: { [idField]: routeId.value } }
        showEditHookDrawer.value = true
      }
    } else {
      await fetchEditPostHook()
      if (editPostHookData.value?.data?.[0]) {
        editHookForm.value = { ...editPostHookData.value.data[0], route: { [idField]: routeId.value } }
        showEditHookDrawer.value = true
      }
    }
    return
  }
  if (!hookId && showEditHookDrawer.value) {
    showEditHookDrawer.value = false
    editingHookId.value = null
    editHookForm.value = {}
    editHookErrors.value = {}
    editHookType.value = 'pre'
  }
}, { immediate: true })

watch(showEditHookDrawer, (isOpen) => {
  setSyncedQuery({
    editHook: isOpen && editingHookId.value ? editingHookId.value : undefined,
    editHookType: isOpen && editHookType.value ? editHookType.value : undefined,
  })
})
</script>

<template>
  <div class="space-y-6">
    <CommonFormCard v-if="showMainTableCard && mainTableInfo">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="lucide:database" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h3 class="text-lg font-semibold text-[var(--text-primary)]">Main Table</h3>
        </div>
      </template>
      <div class="p-4 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20">
        <div class="flex flex-col md:flex-row md:items-center gap-3">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="w-12 h-12 shrink-0 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
              <UIcon name="lucide:table" class="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div class="min-w-0">
              <p class="text-sm text-[var(--text-tertiary)] mb-1">This route is the main route for table:</p>
              <h4 class="text-base font-semibold text-[var(--text-primary)]">
                {{ mainTableInfo.name || mainTableInfo.tableName || 'Unknown Table' }}
              </h4>
              <p v-if="mainTableInfo.description" class="text-xs text-[var(--text-tertiary)] mt-1">
                {{ mainTableInfo.description }}
              </p>
            </div>
          </div>
          <UBadge size="lg" variant="soft" color="primary" class="shrink-0 self-start md:self-center">
            Main Route
          </UBadge>
        </div>
      </div>
    </CommonFormCard>

    <CommonFormCard v-if="routeData?.data?.[0] || routeLoading">
      <UForm :state="form" @submit="updateRoute">
        <FormEditorLazy
          ref="formEditorRef"
          v-model="form"
          v-model:errors="errors"
          @has-changed="(hasChanged: boolean) => hasFormChanges = hasChanged"
          table-name="route_definition"
          :excluded="['routePermissions', 'mainTable', 'handlers', 'hooks', 'preHooks', 'postHooks', 'guards']"
          :field-map="typeMap"
          :loading="routeLoading"
        />

        <div class="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-6">
          <UButton
            v-if="hasFormChanges"
            label="Reset"
            icon="lucide:rotate-ccw"
            variant="outline"
            color="warning"
            :disabled="!hasFormChanges"
            @click="handleReset"
          />
          <UButton
            v-if="canUpdateRoute !== false"
            label="Save"
            icon="lucide:save"
            variant="solid"
            color="primary"
            type="submit"
            :loading="updateLoading"
            :disabled="!hasFormChanges"
          />
        </div>
      </UForm>
    </CommonFormCard>

    <RouteExecutionFlowVisualization
      v-if="routeData?.data?.[0]"
      :route-data="routeData"
      :available-methods="availableMethodStrings"
      :handlers="displayHandlers"
      :sorted-pre-hooks="sortedPreHooks"
      :sorted-after-hooks="sortedAfterHooks"
      :get-pre-hook-priority="getPreHookPriority"
      :get-after-hook-priority="getAfterHookPriority"
      :get-id="getId"
      :has-main-table="!!mainTableInfo"
      :can-create-handler="canCreateHandler"
      :default-handler="defaultHandler"
      @edit-handler="editHandler"
      @edit-hook="editHook"
      @create-handler="createHandler($event)"
      @create-hook="(type, method, priority) => createHook(type, method, priority)"
      @delete-handler="deleteHandler"
      @delete-hook="deleteHook"
      @toggle-hook="toggleHook"
    />

    <GuardRouteGuardSection
      v-if="routeId"
      :guards="routeGuards"
      :global-guards="globalGuards"
      :loading="guardsLoading"
      @create-guard="openCreateGuardDrawer"
    />

    <CommonFormCard v-if="routeId">
      <PermissionManager
        table-name="route_permission_definition"
        :current-field-id="{ field: 'route', value: routeId }"
        icon="lucide:shield"
        title="Route Permissions"
      />
    </CommonFormCard>

    <CommonEmptyState
      v-if="showEmptyState !== false && !routeLoading && !routeData?.data?.[0]"
      title="No route configured"
      description="This collection does not have an associated route yet. Routes are automatically created when a collection is saved."
      icon="lucide:route"
      size="sm"
    />

    <RouteCreateHandlerDrawer
      v-model="showCreateHandlerDrawer"
      v-model:form="handlerForm"
      v-model:errors="handlerErrors"
      :loading="createHandlerLoading"
      :route-id="routeId"
      :route-path="routePath"
      :allowed-methods="handlerAvailableMethods"
      :lock-method="handlerLockedMethod"
      @save="saveHandler"
      @cancel="handleCancelHandler"
    />

    <RouteCreateHookDrawer
      v-model="showCreateHookDrawer"
      v-model:form="hookForm"
      v-model:errors="hookErrors"
      :loading="createHookLoading"
      :hook-type="hookType"
      :route-id="routeId"
      :route-path="routePath"
      :allowed-methods="availableMethodStrings"
      :lock-method="hookLockedMethod"
      @save="saveHook"
      @cancel="handleCancelHook"
    />

    <RouteEditHandlerDrawer
      v-model="showEditHandlerDrawer"
      v-model:form="editHandlerForm"
      v-model:errors="editHandlerErrors"
      :loading="updateHandlerLoading"
      :route-id="routeId"
      :route-path="routePath"
      :allowed-methods="availableMethodStrings"
      :lock-method="true"
      @save="updateHandler"
      @cancel="handleCancelEditHandler"
    />

    <RouteEditHookDrawer
      v-model="showEditHookDrawer"
      v-model:form="editHookForm"
      v-model:errors="editHookErrors"
      :loading="updateHookLoading"
      :hook-type="editHookType"
      :route-id="routeId"
      :route-path="routePath"
      :allowed-methods="availableMethodStrings"
      :lock-method="true"
      @save="updateHook"
      @cancel="handleCancelEditHook"
      @delete="deleteHook({ ...editHookForm, _hookType: editHookType, [getIdFieldName()]: editingHookId })"
    />

    <GuardCreateForRouteDrawer
      v-model="showCreateGuardDrawer"
      v-model:form="guardForm"
      v-model:errors="guardErrors"
      :loading="createGuardLoading"
      @save="saveGuard"
      @cancel="showCreateGuardDrawer = false"
    />

    <RouteApiTestModal
      v-model="showApiTestModal"
      :route-path="routePath"
      :available-methods="availableMethodStrings"
      :published-methods="publishedMethodStrings"
      :handlers="displayHandlers"
      :main-table-name="mainTableName"
      :schemas="schemas"
      :columns="mainTableColumns"
    />
  </div>
</template>
