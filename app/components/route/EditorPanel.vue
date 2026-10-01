<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
import {
  buildGuardBodyFromTemplate,
  buildGuardRuleBodyFromTemplate,
  getGuardTemplate,
  getGuardTemplatesForScope,
} from '~/utils/guard-templates'
import {
  getRouteMethodConfigFieldMap,
  getRouteMethodFileFieldMap,
  routeMethodConfigSections,
} from '~/utils/route-method-config-forms'
import type { RouteMethodFileFieldDraft } from '~/types/route-method-config'

const props = withDefaults(defineProps<{
  tableName?: string
  routeId?: string
  externalApiTest?: boolean
  showMainTableCard?: boolean
  showEmptyState?: boolean
  canUpdateRoute?: boolean
  syncQuery?: boolean
  showTabDivider?: boolean
  embedded?: boolean
}>(), {
  externalApiTest: false,
  showMainTableCard: false,
  showEmptyState: true,
  canUpdateRoute: true,
  syncQuery: false,
  showTabDivider: true,
  embedded: false,
})

const emit = defineEmits<{
  'close-api-test': []
}>()

const notify = useNotify()
const { confirm } = useConfirm()
const { getId, getIdFieldName } = useDatabase()
const idField = getIdFieldName()
const currentPageRoute = useRoute()
const router = useRouter()
const activeEditorTab = ref<'overview' | 'methods' | 'execution' | 'access'>('overview')
const editorTabs = [
  { label: 'Overview', value: 'overview', icon: 'lucide:settings-2' },
  { label: 'Methods', value: 'methods', icon: 'lucide:list-filter' },
  { label: 'Execution', value: 'execution', icon: 'lucide:workflow' },
  { label: 'Access', value: 'access', icon: 'lucide:shield-check' },
]
const editorTabUi = computed(() => props.embedded ? {
  root: 'w-full items-start',
  list: 'w-fit min-w-0 gap-1 rounded-[var(--radius-control)] border-0 bg-muted p-1',
  trigger: 'h-9 grow-0 rounded-[var(--radius-subcontrol)] px-3 text-xs data-[state=active]:bg-default data-[state=active]:shadow-xs',
  leadingIcon: 'size-4',
  indicator: 'hidden',
} : props.showTabDivider ? undefined : { list: 'border-b-0', indicator: '!bottom-0' })
const { routes, loadRoutes } = useRoutes()
const { registerDataMenuItemsFromRoutes } = useMenuRegistry()
const ROUTE_EDITOR_FIELDS = [
  "*",
  "mainTable.id",
  "mainTable.name",
  "mainTable.description",
  "methodConfigs.id",
  "methodConfigs.method.id",
  "methodConfigs.method.name",
  "methodConfigs.method.buttonColor",
  "methodConfigs.method.textColor",
  "methodConfigs.available",
  "methodConfigs.isPublic",
  "methodConfigs.skipRoleGuard",
  "methodConfigs.timeout",
  "methodConfigs.requestBodyType",
  "methodConfigs.maxUploadFileSize",
  "methodConfigs.maxFiles",
  "methodConfigs.description",
  "methodConfigs.fileFields.id",
  "methodConfigs.fileFields.name",
  "methodConfigs.fileFields.required",
  "methodConfigs.fileFields.maxCount",
  "methodConfigs.fileFields.maxFileSize",
  "methodConfigs.fileFields.allowedMimeTypes",
  "methodConfigs.fileFields.sort",
  "availableMethods.id",
  "availableMethods.name",
  "publicMethods.id",
  "publicMethods.name",
  "skipRoleGuardMethods.id",
  "skipRoleGuardMethods.name",
].join(",")
const ROUTE_GUARD_SUMMARY_FIELDS = [
  "id",
  "name",
  "description",
  "combinator",
  "position",
  "isEnabled",
  "isGlobal",
  "route.id",
  "route.path",
  "methods.id",
  "methods.name",
  "parent",
].join(",")

const routeId = ref<string | undefined>(props.routeId)

const {
  data: routeData,
  pending: routeLoading,
  execute: fetchRoute,
} = useApi(() => '/enfyra_route', {
  query: computed(() => ({
    fields: ROUTE_EDITOR_FIELDS,
    deep: { methodConfigs: { limit: 0, deep: { fileFields: { limit: 0 } } } },
    filter: props.routeId
      ? { [getIdFieldName()]: { _eq: props.routeId } }
      : props.tableName
        ? { mainTable: { name: { _eq: props.tableName } } }
        : undefined,
  })),
  errorContext: 'Fetch Route',
})

const methodConfigs = computed<any[]>(() => {
  const configs = routeData.value?.data?.[0]?.methodConfigs
  return Array.isArray(configs) ? configs : []
})
const methodConfigColumns = [
  { id: 'method', header: 'Method', accessorFn: (config: any) => config.method?.name ?? 'Method' },
  { id: 'status', header: 'Enabled', accessorFn: (config: any) => config.available, enableSorting: false },
  { id: 'access', header: 'Access', accessorFn: (config: any) => config.available ? config.isPublic ? 'Public' : config.skipRoleGuard ? 'Authenticated · role check skipped' : 'Authenticated' : 'Unavailable' },
  { id: 'timeout', header: 'Timeout', accessorFn: (config: any) => config.timeout },
  { id: 'actions', header: '', enableSorting: false, cell: () => '', meta: { class: { th: 'w-10', td: 'w-10 text-right' } } },
]

const availableMethodRecords = computed(() => {
  return methodConfigs.value
    .filter((config) => config.available === true && config.method?.name)
    .map((config) => config.method)
})

const availableMethodStrings = computed(() => {
  return availableMethodRecords.value.map((m: any) => m.name)
})

const publicMethodStrings = computed(() => {
  return methodConfigs.value
    .filter((config) => config.available === true && config.isPublic === true && config.method?.name)
    .map((config) => config.method.name)
})

const mainTableName = computed(
  () => props.tableName || routeData.value?.data?.[0]?.mainTable?.name || "",
)
const { schemas, schema: mainTableSchema } = useSchema(mainTableName)
const mainTableInfo = computed(
  () => mainTableSchema.value || routeData.value?.data?.[0]?.mainTable || null,
)

const {
  handlerAvailableMethods,
  canCreateHandler,
  sortedPreHooks,
  sortedAfterHooks,
  defaultHandler,
  displayHandlers,
  getPreHookPriority,
  getAfterHookPriority,
  refreshRouteWorkflows,
  handlerLockedMethod,
  hookLockedMethod,
  showCreateHandlerDrawer,
  handlerForm,
  handlerErrors,
  createHandlerLoading,
  createHandler,
  handleCancelHandler,
  saveHandler,
  showEditHandlerDrawer,
  editHandlerForm,
  editHandlerErrors,
  editingHandlerId,
  updateHandlerLoading,
  fetchEditHandler,
  editHandler,
  handleCancelEditHandler,
  updateHandler,
  deleteHandler,
  showCreateHookDrawer,
  hookForm,
  hookErrors,
  hookType,
  createHookLoading,
  createHook,
  handleCancelHook,
  saveHook,
  showEditHookDrawer,
  editHookForm,
  editHookErrors,
  editingHookId,
  editHookType,
  updateHookLoading,
  fetchEditPreHook,
  fetchEditPostHook,
  editPreHookData,
  editPostHookData,
  editHook,
  handleCancelEditHook,
  updateHook,
  toggleHook,
  deleteHook,
} = useRouteEditorWorkflows({
  routeId,
  idField,
  availableMethodStrings,
  mainTableName,
})

const { validateForm } = useFormValidation('enfyra_route')
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
} = useApi(() => '/enfyra_route', {
  method: 'patch',
  errorContext: 'Update Route',
})

const {
  error: updateMethodConfigError,
  execute: executeUpdateMethodConfig,
  pending: updateMethodConfigLoading,
} = useApi(() => '/enfyra_route_method_config', {
  method: 'patch',
  errorContext: 'Update Route Method Configuration',
})

const { executeWithResult: createMethodFileField, pending: createMethodFileFieldLoading } = useApi(
  () => '/enfyra_route_method_config_file_field',
  { method: 'post', errorContext: 'Create multipart file field' },
)
const { executeWithResult: updateMethodFileField, pending: updateMethodFileFieldLoading } = useApi(
  () => '/enfyra_route_method_config_file_field',
  { method: 'patch', errorContext: 'Update multipart file field' },
)
const { executeWithResult: deleteMethodFileField, pending: deleteMethodFileFieldLoading } = useApi(
  () => '/enfyra_route_method_config_file_field',
  { method: 'delete', errorContext: 'Remove multipart file field' },
)
const methodFileFieldsLoading = computed(() => createMethodFileFieldLoading.value || updateMethodFileFieldLoading.value || deleteMethodFileFieldLoading.value)
const selectedMethodConfigId = ref<string | null>(null)
const methodConfigDrawerOpen = ref(false)
const methodConfigDraft = reactive({
  available: false,
  isPublic: false,
  skipRoleGuard: false,
  timeout: 30_000,
  description: '',
  requestBodyType: 'none',
  maxUploadFileSize: null as number | null,
  maxFiles: null as number | null,
  fileFields: [] as RouteMethodFileFieldDraft[],
})
const selectedMethodConfig = computed(() => methodConfigs.value.find((config) => String(getId(config)) === selectedMethodConfigId.value) ?? null)
const changedMethodConfigFields = computed(() => {
  const config = selectedMethodConfig.value
  if (!config) return {}
  const nextPublic = methodConfigDraft.available && methodConfigDraft.isPublic
  const nextSkipRole = methodConfigDraft.available && !nextPublic && methodConfigDraft.skipRoleGuard
  return {
    ...(methodConfigDraft.available !== (config.available === true) ? { available: methodConfigDraft.available } : {}),
    ...(nextPublic !== (config.isPublic === true) ? { isPublic: nextPublic } : {}),
    ...(nextSkipRole !== (config.skipRoleGuard === true) ? { skipRoleGuard: nextSkipRole } : {}),
    ...(methodConfigDraft.timeout !== Number(config.timeout) ? { timeout: methodConfigDraft.timeout } : {}),
    ...(methodConfigDraft.description !== (config.description ?? '') ? { description: methodConfigDraft.description } : {}),
    ...(methodConfigDraft.requestBodyType !== (config.requestBodyType ?? 'none') ? { requestBodyType: methodConfigDraft.requestBodyType } : {}),
    ...(methodConfigDraft.maxUploadFileSize !== (config.maxUploadFileSize ?? null) ? { maxUploadFileSize: methodConfigDraft.maxUploadFileSize } : {}),
    ...(methodConfigDraft.maxFiles !== (config.maxFiles ?? null) ? { maxFiles: methodConfigDraft.maxFiles } : {}),
  }
})
const methodConfigFileFieldsChanged = computed(() => JSON.stringify(methodConfigDraft.fileFields) !== JSON.stringify(
  (selectedMethodConfig.value?.fileFields ?? []).map((field: any) => ({
    id: getId(field) ?? undefined, name: field.name, required: field.required === true,
    maxCount: field.maxCount ?? 1, maxFileSize: field.maxFileSize ?? null,
    allowedMimeTypes: field.allowedMimeTypes ?? null, sort: field.sort ?? 0,
  })),
))
const methodConfigHasChanges = computed(() => Object.keys(changedMethodConfigFields.value).length > 0 || methodConfigFileFieldsChanged.value)
const methodConfigSaving = computed(() => updateMethodConfigLoading.value || methodFileFieldsLoading.value)
const methodConfigReadonly = computed(() => props.canUpdateRoute === false || methodConfigSaving.value)
const methodConfigErrors = ref<Record<string, string>>({})
const methodConfigFieldErrors = ref<Record<string, Record<string, string>>>({})
const methodConfigFieldMap = computed(() => getRouteMethodConfigFieldMap({
  readonly: methodConfigReadonly.value,
  available: methodConfigDraft.available,
  isPublic: methodConfigDraft.isPublic,
  multipartAllowed: ['POST', 'PATCH', 'PUT'].includes(selectedMethodConfig.value?.method?.name),
}))
const methodConfigSections = computed(() => routeMethodConfigSections.map(section => ({
  ...section,
  fields: section.id === 'request-body' && (methodConfigDraft.requestBodyType === 'multipart' || methodConfigDraft.fileFields.length)
    ? [...section.fields, 'maxUploadFileSize', 'maxFiles']
    : section.fields,
})))
const methodFileFieldMap = computed(() => getRouteMethodFileFieldMap(methodConfigReadonly.value))
const methodConfigForm = computed({
  get: () => methodConfigDraft,
  set: (value: Record<string, any>) => {
    Object.assign(methodConfigDraft, value)
    methodConfigDraft.timeout = Number(value.timeout)
    for (const key of ['maxUploadFileSize', 'maxFiles'] as const) {
      methodConfigDraft[key] = value[key] == null || value[key] === '' ? null : Number(value[key])
    }
  },
})

function updateMethodFileFieldDraft(index: number, value: Record<string, any>) {
  const field = methodConfigDraft.fileFields[index]
  if (!field) return
  Object.assign(field, value, {
    maxCount: Number(value.maxCount),
    maxFileSize: value.maxFileSize == null || value.maxFileSize === '' ? null : Number(value.maxFileSize),
  })
}
const { togglingMethodConfigId, toggleMethodAvailability } = useRouteMethodAvailability({
  canUpdate: () => props.canUpdateRoute !== false,
  isSaving: () => methodConfigDrawerOpen.value || methodConfigSaving.value,
  refresh: fetchRoute,
})

function addMethodFileField() {
  methodConfigDraft.fileFields.push({ name: 'file', required: false, maxCount: 1, maxFileSize: null, allowedMimeTypes: null, sort: methodConfigDraft.fileFields.length })
}

function openMethodConfig(config: any) {
  if (togglingMethodConfigId.value !== null || methodConfigSaving.value) return
  selectedMethodConfigId.value = String(getId(config))
  Object.assign(methodConfigDraft, {
    available: config.available === true,
    isPublic: config.isPublic === true,
    skipRoleGuard: config.skipRoleGuard === true,
    timeout: Number(config.timeout),
    description: config.description ?? '',
    requestBodyType: config.requestBodyType ?? 'none',
    maxUploadFileSize: config.maxUploadFileSize ?? null,
    maxFiles: config.maxFiles ?? null,
    fileFields: (config.fileFields ?? []).map((field: any) => ({
      id: getId(field) ?? undefined, name: field.name, required: field.required === true,
      maxCount: field.maxCount ?? 1, maxFileSize: field.maxFileSize ?? null,
      allowedMimeTypes: field.allowedMimeTypes ?? null, sort: field.sort ?? 0,
    })),
  })
  methodConfigErrors.value = {}
  methodConfigFieldErrors.value = {}
  methodConfigDrawerOpen.value = true
}

async function closeMethodConfig() {
  if (updateMethodConfigLoading.value || methodFileFieldsLoading.value) return
  if (methodConfigHasChanges.value && !await confirm({
    title: 'Discard method changes?',
    content: 'The multipart fields and method settings you edited have not been saved.',
  })) return
  methodConfigDrawerOpen.value = false
  selectedMethodConfigId.value = null
}

async function saveMethodConfig() {
  const config = selectedMethodConfig.value
  if (!config || !methodConfigHasChanges.value) return
  if (props.canUpdateRoute === false) return
  if (!Number.isSafeInteger(methodConfigDraft.timeout) || methodConfigDraft.timeout < 1) {
    notify.error('Invalid Timeout', 'Enter a positive whole number of milliseconds.')
    return
  }
  const fields = methodConfigDraft.fileFields
  if (methodConfigDraft.requestBodyType === 'multipart' && !['POST', 'PATCH', 'PUT'].includes(config.method?.name)) {
    notify.error('Unsupported method', 'Multipart uploads are available for POST, PATCH, and PUT methods.')
    return
  }
  const names = fields.map(field => field.name.trim())
  if (methodConfigDraft.requestBodyType === 'multipart' && (
    names.some((name, index) => !name || names.indexOf(name) !== index)
    || fields.some(field => !Number.isSafeInteger(Number(field.maxCount)) || Number(field.maxCount) < 1)
    || fields.some(field => field.maxFileSize != null && (!Number.isSafeInteger(Number(field.maxFileSize)) || Number(field.maxFileSize) < 1))
    || fields.some(field => field.allowedMimeTypes != null && (!Array.isArray(field.allowedMimeTypes) || field.allowedMimeTypes.some(type => !type.trim())))
    || (methodConfigDraft.maxFiles != null && (!Number.isSafeInteger(Number(methodConfigDraft.maxFiles)) || Number(methodConfigDraft.maxFiles) < 1))
    || (methodConfigDraft.maxUploadFileSize != null && (!Number.isSafeInteger(Number(methodConfigDraft.maxUploadFileSize)) || Number(methodConfigDraft.maxUploadFileSize) < 1))
  )) {
    notify.error('Invalid multipart configuration', 'File field names must be unique and limits must be positive whole numbers.')
    return
  }
  if (methodConfigDraft.requestBodyType !== 'multipart' && fields.length && (config.requestBodyType === 'multipart' || methodConfigFileFieldsChanged.value)) {
    notify.error('Multipart fields still configured', 'Remove file fields before switching this method away from multipart.')
    return
  }
  if (Object.keys(changedMethodConfigFields.value).length) {
    const result = await executeUpdateMethodConfig({ id: getId(config), body: changedMethodConfigFields.value })
    if (updateMethodConfigError.value || result == null) { await fetchRoute(); return }
  }
  if (methodConfigFileFieldsChanged.value) {
    const original = (config.fileFields ?? []) as any[]
    for (const field of fields) {
      const body = {
        name: field.name.trim(), required: field.required, maxCount: Number(field.maxCount),
        maxFileSize: field.maxFileSize == null ? null : Number(field.maxFileSize),
        allowedMimeTypes: field.allowedMimeTypes, sort: fields.indexOf(field),
      }
      const saved = field.id != null
        ? original.find(item => String(getId(item)) === String(field.id))
        : null
      if (field.id != null && JSON.stringify(body) === JSON.stringify({
        name: saved?.name, required: saved?.required === true, maxCount: saved?.maxCount ?? 1,
        maxFileSize: saved?.maxFileSize ?? null, allowedMimeTypes: saved?.allowedMimeTypes ?? null, sort: saved?.sort ?? 0,
      })) continue
      const result = field.id != null
        ? await updateMethodFileField({ id: field.id, body })
        : await createMethodFileField({ body: { ...body, routeMethodConfig: { [idField]: getId(config) } } })
      if (!result.ok) { await fetchRoute(); return }
    }
    for (const field of original) {
      if (fields.some(item => String(item.id) === String(getId(field)))) continue
      const result = await deleteMethodFileField({ id: getId(field) })
      if (!result.ok) { await fetchRoute(); return }
    }
  }
  methodConfigDrawerOpen.value = false
  selectedMethodConfigId.value = null
  await fetchRoute()
  notify.success('Success', `${config.method?.name} configuration updated!`)
}

async function updateRoute() {
  if (!form.value || !routeId.value) return

  const body = { ...form.value }
  for (const field of ['methodConfigs', 'availableMethods', 'publicMethods', 'skipRoleGuardMethods']) {
    delete body[field]
  }

  if (!await validateForm(body, errors)) return

  await executeUpdateRoute({ id: routeId.value, body })

  if (updateRouteError.value) return

  notify.success("Success", "Route updated!")
  errors.value = {}
  hasFormChanges.value = false

  await loadRoutes()
  registerDataMenuItemsFromRoutes(routes.value)

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

registerHeaderActions([
  {
    id: 'reset-route',
    label: 'Reset',
    icon: 'lucide:rotate-ccw',
    variant: 'outline',
    color: 'warning',
    order: 1,
    show: computed(() => activeEditorTab.value === 'overview' && hasFormChanges.value),
    disabled: computed(() => routeLoading.value || updateLoading.value || !hasFormChanges.value),
    onClick: handleReset,
  },
  {
    id: 'save-route',
    label: 'Save',
    icon: 'lucide:save',
    variant: 'solid',
    color: 'primary',
    order: 999,
    show: computed(() => activeEditorTab.value === 'overview' && !!routeData.value?.data?.[0] && props.canUpdateRoute !== false),
    loading: computed(() => updateLoading.value),
    disabled: computed(() => routeLoading.value || !routeId.value || !hasFormChanges.value),
    onClick: updateRoute,
    permission: {
      and: [{ route: '/enfyra_route', methods: ['PATCH'] }],
    },
  },
])

const mainTableColumns = computed(() => {
  const tableSchema = mainTableName.value ? schemas.value?.[mainTableName.value] : null
  if (!tableSchema) return []
  const cols = tableSchema.columns || tableSchema.fields || []
  return cols.map((c: any) => c.name || c.propertyName).filter(Boolean)
})

async function refreshAll() {
  await Promise.all([
    refreshRouteWorkflows(),
    fetchRouteGuards(),
    fetchGlobalGuards(),
  ])
}

watch(() => routeData.value?.data?.[0], async (newRoute) => {
  if (newRoute) {
    const nextRouteId = String(getId(newRoute))
    if (methodConfigDrawerOpen.value && routeId.value && routeId.value !== nextRouteId) closeMethodConfig()
    routeId.value = nextRouteId
    form.value = { ...newRoute }
    formChanges.update(newRoute)
    if (methodConfigDrawerOpen.value && !selectedMethodConfig.value) closeMethodConfig()

    typeMap.value = {
      isEnabled: {
        disabled: !!mainTableInfo.value,
      },
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

// --- Guard Management ---

const {
  data: routeGuardsData,
  pending: routeGuardsLoading,
  execute: fetchRouteGuards,
} = useApi(() => '/enfyra_guard', {
  query: computed(() => ({
    fields: ROUTE_GUARD_SUMMARY_FIELDS,
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
} = useApi(() => '/enfyra_guard', {
  query: computed(() => ({
    fields: ROUTE_GUARD_SUMMARY_FIELDS,
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
const selectedGuardTemplate = ref<string | null>(null)
const routeGuardTemplates = getGuardTemplatesForScope('route')

const {
  data: createGuardData,
  error: createGuardError,
  execute: executeCreateGuard,
  pending: createGuardLoading,
} = useApi(() => '/enfyra_guard', { method: 'post', errorContext: 'Create Guard' })

const {
  error: createGuardRuleError,
  execute: executeCreateGuardRule,
} = useApi(() => '/enfyra_guard_rule', { method: 'post', errorContext: 'Create Guard Rule' })

function openCreateGuardDrawer() {
  selectedGuardTemplate.value = routeGuardTemplates[0]?.key || null
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
  applySelectedGuardTemplate()
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

  const template = getGuardTemplate(selectedGuardTemplate.value)
  const createdGuard = createGuardData.value?.data?.[0]
  const createdGuardId = createdGuard ? getId(createdGuard) : null
  if (template && createdGuardId) {
    await executeCreateGuardRule({
      body: buildGuardRuleBodyFromTemplate(template, {
        idField,
        guardId: createdGuardId,
      }),
    })
    if (createGuardRuleError.value) return
  }

  notify.success("Guard created successfully")
  showCreateGuardDrawer.value = false
  selectedGuardTemplate.value = null
  await Promise.all([fetchRouteGuards(), fetchGlobalGuards()])
}

function applySelectedGuardTemplate() {
  const template = getGuardTemplate(selectedGuardTemplate.value)
  if (!template) return

  guardForm.value = {
    ...guardForm.value,
    ...buildGuardBodyFromTemplate(template, {
      scope: 'route',
      idField,
      routeId: routeId.value || null,
      routePath: routePath.value,
    }),
  }
}

watch(selectedGuardTemplate, applySelectedGuardTemplate)

const showApiTestModal = ref(false)
const syncingDrawerFromQuery = ref(false)
const drawerHistoryEntry = ref(false)

watch(() => props.externalApiTest, (val) => {
  if (val) showApiTestModal.value = true
})

watch(showApiTestModal, (val) => {
  if (!val) emit('close-api-test')
})

const routePath = computed(() => routeData.value?.data?.[0]?.path || '')

function buildSyncedQuery(patch: Record<string, string | undefined>) {
  const query = { ...currentPageRoute.query }
  for (const [key, value] of Object.entries(patch)) {
    if (value == null) delete query[key]
    else query[key] = value
  }
  return query
}

function setSyncedQuery(patch: Record<string, string | undefined>) {
  if (!props.syncQuery || syncingDrawerFromQuery.value) return
  const query = buildSyncedQuery(patch)
  const isOpening = Object.values(patch).some((value) => value != null)

  if (isOpening) {
    drawerHistoryEntry.value = true
    router.push({ query })
    return
  }

  if (drawerHistoryEntry.value) {
    drawerHistoryEntry.value = false
    router.back()
    return
  }

  router.replace({ query })
}

async function syncDrawerFromQuery<T>(callback: () => T | Promise<T>) {
  syncingDrawerFromQuery.value = true
  try {
    await callback()
  } finally {
    await nextTick()
    syncingDrawerFromQuery.value = false
  }
}

watch(() => currentPageRoute.query.createHandler, (value) => {
  if (!props.syncQuery) return
  const shouldOpen = value === 'true'
  if (shouldOpen && !showCreateHandlerDrawer.value) {
    activeEditorTab.value = 'execution'
    void syncDrawerFromQuery(createHandler)
  }
  if (!shouldOpen && showCreateHandlerDrawer.value) {
    void syncDrawerFromQuery(() => { showCreateHandlerDrawer.value = false })
  }
}, { immediate: true })

watch(showCreateHandlerDrawer, (isOpen) => {
  setSyncedQuery({ createHandler: isOpen ? 'true' : undefined })
})

watch(() => currentPageRoute.query.editHandler, async (value) => {
  if (!props.syncQuery) return
  if (typeof value === 'string' && value && value !== editingHandlerId.value) {
    await syncDrawerFromQuery(async () => {
      activeEditorTab.value = 'execution'
      editingHandlerId.value = value
      editHandlerErrors.value = {}
      await fetchEditHandler()
      showEditHandlerDrawer.value = true
    })
    return
  }
  if (!value && showEditHandlerDrawer.value) {
    await syncDrawerFromQuery(() => {
      showEditHandlerDrawer.value = false
      editingHandlerId.value = null
      editHandlerForm.value = {}
      editHandlerErrors.value = {}
    })
  }
}, { immediate: true })

watch(showEditHandlerDrawer, (isOpen) => {
  setSyncedQuery({ editHandler: isOpen && editingHandlerId.value ? editingHandlerId.value : undefined })
})

watch(() => currentPageRoute.query.createHook, (value) => {
  if (!props.syncQuery) return
  const shouldOpen = value === 'true' || value === 'pre' || value === 'post'
  if (shouldOpen && !showCreateHookDrawer.value) {
    activeEditorTab.value = 'execution'
    void syncDrawerFromQuery(() => createHook(value === 'post' ? 'post' : 'pre'))
  }
  if (!shouldOpen && showCreateHookDrawer.value) {
    void syncDrawerFromQuery(() => { showCreateHookDrawer.value = false })
  }
}, { immediate: true })

watch(showCreateHookDrawer, (isOpen) => {
  setSyncedQuery({ createHook: isOpen ? hookType.value || 'pre' : undefined })
})

watch(() => [currentPageRoute.query.editHook, currentPageRoute.query.editHookType], async ([hookId, hookTypeParam]) => {
  if (!props.syncQuery) return
  if (typeof hookId === 'string' && hookId) {
    const nextType = hookTypeParam === 'post' ? 'post' : 'pre'
    if (hookId === editingHookId.value && nextType === editHookType.value && showEditHookDrawer.value) return
    await syncDrawerFromQuery(async () => {
      activeEditorTab.value = 'execution'
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
    })
    return
  }
  if (!hookId && showEditHookDrawer.value) {
    await syncDrawerFromQuery(() => {
      showEditHookDrawer.value = false
      editingHookId.value = null
      editHookForm.value = {}
      editHookErrors.value = {}
      editHookType.value = 'pre'
    })
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
    <CommonTabbedPanel :framed="!props.embedded">
      <template #header>
      <div v-if="routeData?.data?.[0] || routeLoading">
      <UTabs
        v-model="activeEditorTab"
        :items="editorTabs"
        :content="false"
        :variant="props.embedded ? 'pill' : 'link'"
        :size="props.embedded ? 'sm' : 'md'"
        :ui="editorTabUi"
      />
      </div>
      </template>

    <template v-if="activeEditorTab === 'overview'">
    <CommonFormCard v-if="showMainTableCard && mainTableInfo" :bordered="false">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="lucide:database" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h3 class="text-lg font-semibold text-[var(--text-primary)]">Main Table</h3>
        </div>
      </template>
      <div class="eapp-bordered-region p-4">
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
          table-name="enfyra_route"
          mode="update"
          :current-record-id="routeId"
          :excluded="['routePermissions', 'mainTable', 'handlers', 'hooks', 'preHooks', 'postHooks', 'guards', 'methodConfigs', 'availableMethods', 'publicMethods', 'skipRoleGuardMethods']"
          :field-map="typeMap"
          :loading="routeLoading"
        />

      </UForm>
    </CommonFormCard>
    </template>

    <CommonFormCard v-if="activeEditorTab === 'methods' && methodConfigs.length" :bordered="false" title="Methods" description="Toggle a method to enable it, or select its row for more settings.">
      <DataTable
        :data="methodConfigs"
        :columns="methodConfigColumns"
        :get-row-id="(config) => String(getId(config))"
        :show-column-visibility="false"
        @row-click="openMethodConfig"
      >
        <template #method-cell="{ row }">
          <MethodBadge :method="row.original.method" size="sm" />
        </template>
        <template #status-cell="{ row }">
          <div class="flex w-fit items-center" @click.stop @keydown.stop>
            <USwitch
              :model-value="row.original.available === true"
              size="sm"
              :loading="togglingMethodConfigId === String(getId(row.original))"
              :disabled="canUpdateRoute === false || togglingMethodConfigId !== null || methodConfigDrawerOpen || methodConfigSaving"
              :aria-label="`Enable ${row.original.method?.name}`"
              @update:model-value="value => toggleMethodAvailability(row.original, value)"
            />
          </div>
        </template>
        <template #timeout-cell="{ row }">
          <span class="whitespace-nowrap font-mono text-xs tabular-nums">{{ Number(row.original.timeout).toLocaleString() }} <span class="text-[var(--text-tertiary)]">ms</span></span>
        </template>
        <template #actions-cell>
          <UIcon name="lucide:chevron-right" class="size-4 align-middle text-[var(--text-tertiary)]" aria-hidden="true" />
        </template>
      </DataTable>
    </CommonFormCard>

    <CommonDrawer
      :model-value="methodConfigDrawerOpen"
      :handle="false"
      :show-close="false"
      direction="right"
      :cancel-action="{ label: 'Cancel', onClick: closeMethodConfig }"
      :primary-action="canUpdateRoute === false ? false : { label: 'Save changes', loading: methodConfigSaving, disabled: !methodConfigHasChanges || methodConfigSaving, onClick: saveMethodConfig }"
      @update:model-value="(open) => { if (!open) closeMethodConfig() }"
    >
      <template #header>
        <div class="flex min-w-0 items-start justify-between gap-4">
          <div class="min-w-0 space-y-1.5">
            <div class="flex items-center gap-2.5">
              <MethodBadge v-if="selectedMethodConfig?.method" :method="selectedMethodConfig.method" size="sm" />
              <h2 class="text-base font-semibold text-[var(--text-primary)]">Method settings</h2>
            </div>
            <p class="truncate font-mono text-xs text-[var(--text-tertiary)]" :title="routePath">{{ routePath }}</p>
          </div>
          <UButton type="button" icon="lucide:x" color="neutral" variant="ghost" size="sm" aria-label="Close method settings" :disabled="methodConfigSaving" @click.stop.prevent="closeMethodConfig" />
        </div>
      </template>
      <template #body>
        <CommonFormCard v-if="selectedMethodConfig" :bordered="false">
          <UForm :state="methodConfigForm" @submit="saveMethodConfig">
            <FormEditorLazy
              v-model="methodConfigForm"
              v-model:errors="methodConfigErrors"
              table-name="enfyra_route_method_config"
              mode="update"
              :current-record-id="getId(selectedMethodConfig)"
              :sections="methodConfigSections"
              :field-map="methodConfigFieldMap"
            />
            <div v-if="methodConfigDraft.requestBodyType === 'multipart' || methodConfigDraft.fileFields.length" class="mt-10 space-y-5">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--text-quaternary)]">File fields</h3>
                <UButton v-if="methodConfigDraft.requestBodyType === 'multipart'" type="button" label="Add field" icon="lucide:plus" color="neutral" size="sm" variant="outline" :disabled="methodConfigReadonly" @click.stop.prevent="addMethodFileField" />
              </div>
              <p v-if="!methodConfigDraft.fileFields.length" class="text-sm text-[var(--text-tertiary)]">The default <code>file</code> field accepts one upload.</p>
              <CommonFormCard v-for="(field, index) in methodConfigDraft.fileFields" :key="field.id ?? `new-${index}`" size="sm">
                <template #header>
                  <div class="flex items-center justify-between gap-3">
                    <h4 class="text-sm font-medium">{{ field.name || `Field ${index + 1}` }}</h4>
                    <UButton type="button" icon="lucide:trash-2" color="error" variant="ghost" size="sm" :aria-label="`Remove ${field.name || `field ${index + 1}`}`" :disabled="methodConfigReadonly" @click.stop.prevent="methodConfigDraft.fileFields.splice(index, 1)" />
                  </div>
                </template>
                <FormEditorLazy
                  :model-value="field"
                  :errors="methodConfigFieldErrors[String(field.id ?? `new-${index}`)] ?? {}"
                  table-name="enfyra_route_method_config_file_field"
                  :mode="field.id == null ? 'create' : 'update'"
                  :current-record-id="field.id ?? null"
                  :includes="['name', 'maxCount', 'maxFileSize', 'allowedMimeTypes', 'required']"
                  :field-map="methodFileFieldMap"
                  @update:model-value="value => updateMethodFileFieldDraft(index, value)"
                  @update:errors="value => methodConfigFieldErrors[String(field.id ?? `new-${index}`)] = value"
                />
              </CommonFormCard>
            </div>
          </UForm>
        </CommonFormCard>
      </template>
    </CommonDrawer>

    <RouteExecutionFlowVisualization
      v-if="activeEditorTab === 'execution' && routeData?.data?.[0]"
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

    <FlowTriggersPanel
      v-if="activeEditorTab === 'execution' && routeId"
      mode="route"
      :route-id="routeId"
      :available-methods="availableMethodStrings"
    />

    <GuardRouteGuardSection
      v-if="activeEditorTab === 'access' && routeId"
      :guards="routeGuards"
      :global-guards="globalGuards"
      :loading="guardsLoading"
      @create-guard="openCreateGuardDrawer"
    />

    <CommonFormCard v-if="activeEditorTab === 'access' && routeId">
      <PermissionManager
        table-name="enfyra_route_permission"
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

    </CommonTabbedPanel>

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
      v-model:selected-template="selectedGuardTemplate"
      :templates="routeGuardTemplates"
      :loading="createGuardLoading"
      @save="saveGuard"
      @cancel="showCreateGuardDrawer = false"
    />

    <RouteApiTestModal
      v-model="showApiTestModal"
      :route-path="routePath"
      :available-methods="availableMethodRecords"
      :public-methods="publicMethodStrings"
      :handlers="displayHandlers"
      :main-table-name="mainTableName"
      :schemas="schemas"
      :columns="mainTableColumns"
    />
  </div>
</template>
