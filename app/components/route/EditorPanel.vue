<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
import {
  buildGuardBodyFromTemplate,
  buildGuardRuleBodyFromTemplate,
  getGuardTemplate,
  getGuardTemplatesForScope,
} from '~/utils/guard-templates'

const props = withDefaults(defineProps<{
  tableName?: string
  routeId?: string
  externalApiTest?: boolean
  showMainTableCard?: boolean
  showEmptyState?: boolean
  canUpdateRoute?: boolean
  syncQuery?: boolean
}>(), {
  externalApiTest: false,
  showMainTableCard: false,
  showEmptyState: true,
  canUpdateRoute: true,
  syncQuery: false,
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
const { loadRoutes } = useRoutes()
const { schemas } = useSchema()
const { getIncludeFields: getRouteIncludeFields } = useSchema('enfyra_route')

const routeId = ref<string | undefined>(props.routeId)

const {
  data: routeData,
  pending: routeLoading,
  execute: fetchRoute,
} = useApi(() => '/enfyra_route', {
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

const availableMethodRecords = computed(() => {
  const methods = routeData.value?.data?.[0]?.availableMethods
  if (!Array.isArray(methods)) return []
  return methods.filter((m: any) => m?.name)
})

const availableMethodStrings = computed(() => {
  return availableMethodRecords.value.map((m: any) => m.name)
})

const publicMethodStrings = computed(() => {
  const methods = routeData.value?.data?.[0]?.publicMethods
  if (!Array.isArray(methods)) return []
  return methods.filter((m: any) => m?.name).map((m: any) => m.name)
})

const mainTableInfo = computed(() => {
  const data = routeData.value?.data?.[0]
  if (props.tableName) return schemas.value?.[props.tableName] || data?.mainTable || null
  if (!data?.mainTable) return null

  const mainTableId = getId(data.mainTable)
  if (!mainTableId) return data.mainTable

  return Object.values(schemas.value).find((schema: any) => String(getId(schema)) === String(mainTableId)) || data.mainTable
})

const mainTableName = computed(() => mainTableInfo.value?.name || props.tableName)

const {
  handlerAvailableMethods,
  canCreateHandler,
  routePreHooks,
  routePostHooks,
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

function filterPublicToAvailable(body: Record<string, any>) {
  const available = body.availableMethods || []
  const availableSet = new Set(available.filter((m: any) => m?.name).map((m: any) => m.name))
  for (const key of ['publicMethods', 'skipRoleGuardMethods'] as const) {
    if (Array.isArray(body[key])) {
      body[key] = availableSet.size > 0
        ? body[key].filter((m: any) => m?.name && availableSet.has(m.name))
        : []
    }
  }
  for (const key of ['availableMethods', 'publicMethods', 'skipRoleGuardMethods'] as const) {
    if (Array.isArray(body[key])) {
      body[key] = body[key]
        .map((m: any) => {
          const id = getId(m)
          return id != null ? { id, name: m.name } : null
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
  filterPublicToAvailable(body)

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

registerHeaderActions([
  {
    id: 'reset-route',
    label: 'Reset',
    icon: 'lucide:rotate-ccw',
    variant: 'outline',
    color: 'warning',
    order: 1,
    show: computed(() => props.syncQuery !== true && hasFormChanges.value),
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
    show: computed(() => props.syncQuery !== true && !!routeData.value?.data?.[0] && props.canUpdateRoute !== false),
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
    routeId.value = String(getId(newRoute))
    form.value = { ...newRoute }
    formChanges.update(newRoute)

    typeMap.value = {
      isEnabled: {
        disabled: !!mainTableInfo.value,
      },
      publicMethods: {
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

// --- Guard Management ---

const {
  data: routeGuardsData,
  pending: routeGuardsLoading,
  execute: fetchRouteGuards,
} = useApi(() => '/enfyra_guard', {
  query: computed(() => ({
    fields: '*,route.id,route.path,methods.name,parent',
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
    fields: '*,route.id,route.path,methods.name,parent',
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
          table-name="enfyra_route"
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
