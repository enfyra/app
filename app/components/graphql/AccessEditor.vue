<script setup lang="ts">
type Operation = {
  id: string | number
  name: 'QUERY' | 'CREATE' | 'UPDATE' | 'DELETE'
  label: string
  description?: string | null
}

type PermissionForm = {
  id?: string | number
  description: string
  isEnabled: boolean
  role: any
  allowedUsers: any[]
  operations: any[]
}

const props = defineProps<{
  tableId: string | number
  tableName: string
}>()

const notify = useNotify()
const { confirm } = useConfirm()
const { getId, getIdFieldName } = useDatabase()
const idField = getIdFieldName()

const drawerOpen = ref(false)
const editingPermission = ref<any>(null)
const permissionForm = ref<PermissionForm>(emptyPermission())
const scopeMode = ref<'role' | 'users'>('role')
const savingConfig = ref(false)
const savingPermission = ref(false)
const deletingPermissionId = ref<string | number | null>(null)

const {
  data: configData,
  pending: configLoading,
  execute: fetchConfig,
} = useApi(() => '/enfyra_graphql', {
  immediate: false,
  watch: false,
  query: computed(() => ({
    fields: [
      'id',
      'isEnabled',
      'description',
      'publicOperations.id',
      'publicOperations.name',
      'permissions.id',
      'permissions.description',
      'permissions.isEnabled',
      'permissions.role.id',
      'permissions.role.name',
      'permissions.allowedUsers.id',
      'permissions.allowedUsers.name',
      'permissions.allowedUsers.email',
      'permissions.operations.id',
      'permissions.operations.name',
    ].join(','),
    filter: { table: { [idField]: { _eq: props.tableId } } },
    limit: 1,
  })),
  errorContext: 'Fetch GraphQL access',
})

const {
  data: operationsData,
  pending: operationsLoading,
  execute: fetchOperations,
} = useApi(() => '/enfyra_graphql_operation', {
  immediate: false,
  watch: false,
  query: { fields: 'id,name,label,description,order', sort: 'order', limit: 10 },
  errorContext: 'Fetch GraphQL operations',
})

const { data: rolesData, execute: fetchRoles } = useApi(() => '/enfyra_role', {
  immediate: false,
  watch: false,
  query: { fields: 'id,name', sort: 'name', limit: 1000 },
  errorContext: 'Fetch roles',
})

const { data: usersData, execute: fetchUsers } = useApi(() => '/enfyra_user', {
  immediate: false,
  watch: false,
  query: { fields: 'id,name,email', sort: 'email', limit: 1000 },
  errorContext: 'Fetch users',
})

const { error: updateConfigError, execute: updateConfig } = useApi(
  () => '/enfyra_graphql',
  { method: 'patch', immediate: false, watch: false, errorContext: 'Update GraphQL access' },
)
const { error: createConfigError, execute: createConfig } = useApi(
  () => '/enfyra_graphql',
  { method: 'post', immediate: false, watch: false, errorContext: 'Create GraphQL access' },
)
const { error: createPermissionError, execute: createPermission } = useApi(
  () => '/enfyra_graphql_permission',
  { method: 'post', immediate: false, watch: false, errorContext: 'Create GraphQL permission' },
)
const { error: updatePermissionError, execute: updatePermission } = useApi(
  () => '/enfyra_graphql_permission',
  { method: 'patch', immediate: false, watch: false, errorContext: 'Update GraphQL permission' },
)
const { error: deletePermissionError, execute: deletePermission } = useApi(
  () => '/enfyra_graphql_permission',
  { method: 'delete', immediate: false, watch: false, errorContext: 'Delete GraphQL permission' },
)

const config = computed<any>(() => configData.value?.data?.[0] ?? null)
const operations = computed<Operation[]>(() => operationsData.value?.data ?? [])
const roles = computed<any[]>(() => rolesData.value?.data ?? [])
const users = computed<any[]>(() => usersData.value?.data ?? [])
const permissions = computed<any[]>(() => config.value?.permissions ?? [])
const enabled = ref(false)
const publicOperationIds = ref<Array<string | number>>([])

watch(config, (value) => {
  enabled.value = value?.isEnabled === true
  publicOperationIds.value = (value?.publicOperations ?? []).map((item: any) => getId(item))
}, { immediate: true })

const publicOperationNames = computed(() => new Set(
  operations.value
    .filter((operation) => publicOperationIds.value.some((id) => String(id) === String(getId(operation))))
    .map((operation) => operation.name),
))

const privateOperations = computed(() => operations.value.filter(
  (operation) => !publicOperationNames.value.has(operation.name),
))

const loading = computed(() => configLoading.value || operationsLoading.value)

function emptyPermission(): PermissionForm {
  return {
    description: '',
    isEnabled: true,
    role: null,
    allowedUsers: [],
    operations: [],
  }
}

function isSelected(list: any[], item: any): boolean {
  return list.some((selected) => String(getId(selected)) === String(getId(item)))
}

function toggleRelation(list: any[], item: any, checked: boolean): any[] {
  if (checked) return isSelected(list, item) ? list : [...list, { id: getId(item) }]
  return list.filter((selected) => String(getId(selected)) !== String(getId(item)))
}

function togglePublicOperation(operation: Operation, checked: boolean) {
  publicOperationIds.value = toggleRelation(
    publicOperationIds.value.map((id) => ({ id })),
    operation,
    checked,
  ).map((item) => getId(item))
}

function openCreatePermission() {
  editingPermission.value = null
  permissionForm.value = emptyPermission()
  scopeMode.value = 'role'
  drawerOpen.value = true
}

function openEditPermission(permission: any) {
  editingPermission.value = permission
  permissionForm.value = {
    id: getId(permission),
    description: permission.description ?? '',
    isEnabled: permission.isEnabled !== false,
    role: permission.role ? { id: getId(permission.role) } : null,
    allowedUsers: (permission.allowedUsers ?? []).map((user: any) => ({ id: getId(user) })),
    operations: (permission.operations ?? []).map((operation: any) => ({ id: getId(operation) })),
  }
  scopeMode.value = permission.allowedUsers?.length ? 'users' : 'role'
  drawerOpen.value = true
}

function setScopeMode(mode: 'role' | 'users') {
  scopeMode.value = mode
  if (mode === 'role') permissionForm.value.allowedUsers = []
  else permissionForm.value.role = null
}

function operationNames(permission: any): string[] {
  return (permission.operations ?? []).map((operation: any) => operation.name).filter(Boolean)
}

async function saveGraphqlConfig() {
  savingConfig.value = true
  try {
    if (!config.value) {
      if (!enabled.value) {
        savingConfig.value = false
        return
      }
      await createConfig({
        body: {
          table: { id: props.tableId },
          isEnabled: true,
          publicOperations: publicOperationIds.value.map((id) => ({ id })),
        },
      })
      if (createConfigError.value) return
      notify.success('GraphQL enabled for this collection')
    } else {
      await updateConfig({
        id: getId(config.value),
        body: {
          isEnabled: enabled.value,
          publicOperations: publicOperationIds.value.map((id) => ({ id })),
        },
      })
      if (updateConfigError.value) return
      notify.success('GraphQL access updated')
    }
    await fetchConfig()
  } finally {
    savingConfig.value = false
  }
}

async function savePermissionForm() {
  const hasRole = permissionForm.value.role != null
  const hasUsers = permissionForm.value.allowedUsers.length > 0
  if (hasRole === hasUsers) {
    notify.error('Validation Error', 'Choose exactly one scope: one role or one or more users')
    return
  }
  if (permissionForm.value.operations.length === 0) {
    notify.error('Validation Error', 'Select at least one private operation')
    return
  }

  const selectedNames = operations.value
    .filter((operation) => isSelected(permissionForm.value.operations, operation))
    .map((operation) => operation.name)
  const overlap = selectedNames.filter((name) => publicOperationNames.value.has(name))
  if (overlap.length > 0) {
    notify.error('Validation Error', `Public operations cannot have permissions: ${overlap.join(', ')}`)
    return
  }

  const body = {
    description: permissionForm.value.description || null,
    isEnabled: permissionForm.value.isEnabled,
    graphql: { id: getId(config.value) },
    role: hasRole ? permissionForm.value.role : null,
    allowedUsers: hasUsers ? permissionForm.value.allowedUsers : [],
    operations: permissionForm.value.operations,
  }

  savingPermission.value = true
  try {
    if (editingPermission.value) {
      await updatePermission({ id: getId(editingPermission.value), body })
      if (updatePermissionError.value) return
    } else {
      await createPermission({ body })
      if (createPermissionError.value) return
    }
    drawerOpen.value = false
    notify.success(editingPermission.value ? 'GraphQL permission updated' : 'GraphQL permission created')
    await fetchConfig()
  } finally {
    savingPermission.value = false
  }
}

async function removePermission(permission: any) {
  const ok = await confirm({
    title: 'Delete GraphQL Permission',
    content: 'This removes authenticated access granted by this permission.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
  })
  if (!ok) return

  const id = getId(permission)
  deletingPermissionId.value = id
  try {
    await deletePermission({ id })
    if (deletePermissionError.value) return
    notify.success('GraphQL permission deleted')
    await fetchConfig()
  } finally {
    deletingPermissionId.value = null
  }
}

watch(() => props.tableId, async () => {
  await Promise.all([fetchConfig(), fetchOperations(), fetchRoles(), fetchUsers()])
}, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <div class="loading-fade-stack">
    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="loading"
        key="loading"
        title="Loading GraphQL access..."
        description="Fetching operation registry and permissions"
        size="sm"
        type="form"
        context="page"
      />

      <div v-else key="content" class="space-y-6">
      <CommonFormCard>
        <div class="space-y-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <UIcon name="lucide:braces" class="h-5 w-5 text-primary" />
                <h2 class="text-lg font-semibold text-[var(--text-primary)]">GraphQL API</h2>
              </div>
              <p class="mt-1 text-sm text-[var(--text-tertiary)]">
                Enabling GraphQL exposes this collection in the schema. Access is still controlled per operation below.
              </p>
            </div>
            <USwitch v-model="enabled" aria-label="Enable GraphQL" />
          </div>

          <div class="rounded-xl border border-[var(--state-warning-outline-border)] bg-[var(--state-warning-soft-bg)] p-4">
            <div class="flex gap-3">
              <UIcon name="lucide:triangle-alert" class="mt-0.5 h-5 w-5 shrink-0 text-[var(--st-warning)]" />
              <div class="text-sm text-[var(--state-warning-soft-text)]">
                <p class="font-medium text-[var(--state-warning-title-text)]">Public access bypasses GraphQL permissions</p>
                <p class="mt-1">A public operation is callable without a token. Published fields remain readable by default unless field permissions deny them.</p>
              </div>
            </div>
          </div>

          <div v-if="config">
            <div class="mb-3">
              <h3 class="text-sm font-semibold text-[var(--text-primary)]">Public operations</h3>
              <p class="text-xs text-[var(--text-tertiary)]">Public operations cannot also appear in an authenticated permission.</p>
            </div>
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label
                v-for="operation in operations"
                :key="operation.id"
                class="surface-card flex cursor-pointer items-start gap-3 rounded-xl p-4"
              >
                <UCheckbox
                  :model-value="publicOperationIds.some((id) => String(id) === String(getId(operation)))"
                  @update:model-value="(checked) => togglePublicOperation(operation, checked === true)"
                />
                <span class="min-w-0">
                  <span class="block text-sm font-semibold text-[var(--text-primary)]">{{ operation.label }}</span>
                  <span class="mt-1 block text-xs text-[var(--text-tertiary)]">{{ operation.description }}</span>
                </span>
              </label>
            </div>
          </div>

          <div class="flex justify-end">
            <PermissionGate
              :condition="config
                ? { or: [{ route: '/enfyra_graphql', methods: ['PATCH'] }] }
                : { or: [{ route: '/enfyra_graphql', methods: ['POST'] }] }"
            >
              <UButton
                icon="lucide:save"
                :loading="savingConfig"
                :disabled="!enabled && !config"
                @click="saveGraphqlConfig"
              >
                {{ config ? 'Save GraphQL Access' : 'Enable GraphQL' }}
              </UButton>
            </PermissionGate>
          </div>
        </div>
      </CommonFormCard>

      <template v-if="config">
        <CommonFormCard>
          <div class="space-y-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold text-[var(--text-primary)]">Authenticated permissions</h2>
                <p class="text-sm text-[var(--text-tertiary)]">Private operations are default-deny unless the caller is root admin or matches a permission.</p>
              </div>
              <PermissionGate :condition="{ or: [{ route: '/enfyra_graphql_permission', methods: ['POST'] }] }">
                <UButton icon="lucide:plus" size="sm" @click="openCreatePermission">Add Permission</UButton>
              </PermissionGate>
            </div>

            <div v-if="permissions.length" class="space-y-2">
              <div v-for="permission in permissions" :key="getId(permission)" class="surface-card rounded-xl p-4">
                <div class="flex items-start justify-between gap-4">
                  <button class="min-w-0 flex-1 text-left" type="button" @click="openEditPermission(permission)">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-medium text-[var(--text-primary)]">{{ permission.description || 'GraphQL permission' }}</span>
                      <UBadge :color="permission.isEnabled ? 'success' : 'neutral'" variant="soft" size="xs">
                        {{ permission.isEnabled ? 'enabled' : 'disabled' }}
                      </UBadge>
                      <UBadge color="secondary" variant="soft" size="xs">
                        {{ permission.role?.name || `${permission.allowedUsers?.length || 0} users` }}
                      </UBadge>
                    </div>
                    <div class="mt-2 flex flex-wrap gap-1.5">
                      <UBadge v-for="name in operationNames(permission)" :key="name" color="neutral" variant="outline" size="xs">{{ name }}</UBadge>
                    </div>
                  </button>
                  <UButton
                    icon="lucide:trash"
                    color="error"
                    variant="ghost"
                    size="xs"
                    :loading="deletingPermissionId === getId(permission)"
                    @click="removePermission(permission)"
                  />
                </div>
              </div>
            </div>
            <CommonEmptyState v-else title="No authenticated permissions" description="All private operations are currently denied for non-root users." icon="lucide:shield-off" size="sm" />
          </div>
        </CommonFormCard>

        <CommonDrawer
          v-model="drawerOpen"
          direction="right"
          :cancel-action="{ label: 'Cancel', icon: 'lucide:x', onClick: () => (drawerOpen = false) }"
          :primary-action="{ label: editingPermission ? 'Update' : 'Create', loading: savingPermission, onClick: savePermissionForm }"
        >
          <template #header>
            <h2 class="text-lg font-semibold">{{ editingPermission ? 'Edit' : 'Create' }} GraphQL Permission</h2>
          </template>
          <template #body>
            <div class="space-y-6">
              <UFormField label="Description">
                <UTextarea v-model="permissionForm.description" class="w-full" placeholder="Describe who receives these operations" />
              </UFormField>

              <div class="flex items-center justify-between rounded-xl border border-[var(--border-default)] p-4">
                <div>
                  <div class="text-sm font-medium text-[var(--text-primary)]">Enabled</div>
                  <div class="text-xs text-[var(--text-tertiary)]">Disabled permissions grant no access.</div>
                </div>
                <USwitch v-model="permissionForm.isEnabled" />
              </div>

              <div class="space-y-3">
                <div class="text-sm font-semibold text-[var(--text-primary)]">Scope</div>
                <div class="grid grid-cols-2 gap-2">
                  <UButton :variant="scopeMode === 'role' ? 'solid' : 'outline'" @click="setScopeMode('role')">One role</UButton>
                  <UButton :variant="scopeMode === 'users' ? 'solid' : 'outline'" @click="setScopeMode('users')">Explicit users</UButton>
                </div>

                <div v-if="scopeMode === 'role'" class="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-[var(--border-default)] p-3">
                  <label v-for="role in roles" :key="getId(role)" class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--surface-muted)]">
                    <input
                      type="radio"
                      name="graphql-role"
                      :checked="String(getId(permissionForm.role)) === String(getId(role))"
                      @change="permissionForm.role = { id: getId(role) }"
                    >
                    <span class="text-sm text-[var(--text-primary)]">{{ role.name }}</span>
                  </label>
                </div>

                <div v-else class="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-[var(--border-default)] p-3">
                  <label v-for="user in users" :key="getId(user)" class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--surface-muted)]">
                    <UCheckbox
                      :model-value="isSelected(permissionForm.allowedUsers, user)"
                      @update:model-value="(checked) => permissionForm.allowedUsers = toggleRelation(permissionForm.allowedUsers, user, checked === true)"
                    />
                    <span class="min-w-0 text-sm text-[var(--text-primary)]">
                      <span class="block truncate">{{ user.email || user.name }}</span>
                      <span v-if="user.name && user.email" class="block truncate text-xs text-[var(--text-tertiary)]">{{ user.name }}</span>
                    </span>
                  </label>
                </div>
              </div>

              <div class="space-y-3">
                <div>
                  <div class="text-sm font-semibold text-[var(--text-primary)]">Private operations</div>
                  <div class="text-xs text-[var(--text-tertiary)]">Public operations are excluded and cannot be granted here.</div>
                </div>
                <label v-for="operation in privateOperations" :key="operation.id" class="surface-card flex cursor-pointer items-start gap-3 rounded-xl p-3">
                  <UCheckbox
                    :model-value="isSelected(permissionForm.operations, operation)"
                    @update:model-value="(checked) => permissionForm.operations = toggleRelation(permissionForm.operations, operation, checked === true)"
                  />
                  <span>
                    <span class="block text-sm font-medium text-[var(--text-primary)]">{{ operation.label }}</span>
                    <span class="block text-xs text-[var(--text-tertiary)]">{{ operation.description }}</span>
                  </span>
                </label>
              </div>
            </div>
          </template>
        </CommonDrawer>
        </template>
      </div>
    </Transition>
    </div>
  </div>
</template>

<style scoped>
.loading-fade-stack {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

.loading-fade-stack > * {
  grid-area: 1 / 1;
  min-width: 0;
}
</style>
