<template>
  <div class="space-y-4">

    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <UIcon :name="icon || 'lucide:shield'" class="w-5 h-5 shrink-0" />
        <h3 class="text-lg font-semibold truncate">
          {{ title || `Permissions for ${tableName}` }}
        </h3>
      </div>
      <PermissionGate
        class="!w-auto !h-auto shrink-0"
        :condition="{
          or: [{ route: `/${permissionTableName}`, actions: ['create'] }],
        }"
      >
        <UButton
          @click="createNewPermission"
          icon="lucide:plus"
          color="primary"
          variant="solid"
          size="sm"
        >
          Add Permission
        </UButton>
      </PermissionGate>
    </div>

    <Transition name="loading-fade" mode="out-in">
      <CommonLoadingState
        v-if="!isMounted || loading"
        title="Loading permissions..."
        description="Fetching permission data"
        size="sm"
        type="form"
        context="page"
      />

      <div v-else-if="permissions.length > 0" class="space-y-2">
        <div
          v-for="permission in permissions"
          :key="permission.id"
        >
          <PermissionGate
            :condition="{
              or: [{ route: `/${permissionTableName}`, actions: ['update'] }],
            }"
          >
            <div
              @click="editPermission(permission)"
              class="surface-card rounded-lg p-3 cursor-pointer hover:bg-[var(--surface-muted)] transition-colors"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2 min-w-0">
                  <div
                    :class="[
                      'w-2 h-2 rounded-full shrink-0',
                      permission.isEnabled ? 'bg-success-500' : 'bg-[var(--border-strong)]'
                    ]"
                  />
                  <span class="font-medium text-sm text-[var(--text-primary)] truncate">
                    {{ permission.description || "Permission" }}
                  </span>
                  <UBadge
                    v-if="permission.role"
                    color="secondary"
                    variant="soft"
                    size="xs"
                  >
                    {{ permission.role.name }}
                  </UBadge>
                  <UBadge
                    v-if="permission.allowedUsers?.length"
                    color="info"
                    variant="soft"
                    size="xs"
                  >
                    {{ permission.allowedUsers.length }} user{{ permission.allowedUsers.length > 1 ? 's' : '' }}
                  </UBadge>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <template v-for="m in permission.methods" :key="m.method">
                    <span
                      class="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold"
                      :class="[
                        m.method === 'GET' ? 'bg-success-500/15 text-success-600 dark:text-success-400' :
                        m.method === 'POST' ? 'bg-info-500/15 text-info-600 dark:text-info-400' :
                        m.method === 'PUT' || m.method === 'PATCH' ? 'bg-warning-500/15 text-warning-600 dark:text-warning-400' :
                        m.method === 'DELETE' ? 'bg-error-500/15 text-error-600 dark:text-error-400' :
                        'bg-[var(--surface-muted)] text-[var(--text-tertiary)]'
                      ]"
                    >
                      {{ m.method }}
                    </span>
                  </template>
                  <span v-if="!permission.methods?.length" class="text-[10px] text-[var(--text-quaternary)]">
                    No methods
                  </span>
                  <PermissionGate
                    :condition="{
                      or: [{ route: `/${permissionTableName}`, actions: ['delete'] }],
                    }"
                  >
                    <UButton
                      icon="lucide:trash"
                      color="error"
                      variant="ghost"
                      size="xs"
                      class="ml-1"
                      @click.stop="deletePermission(permission)"
                      :loading="deleting === permission.id"
                      :disabled="deleting === permission.id"
                    />
                  </PermissionGate>
                </div>
              </div>
            </div>
          </PermissionGate>

          <div
            v-if="!checkPermissionCondition({ or: [{ route: `/${permissionTableName}`, actions: ['update'] }] })"
            class="surface-card rounded-lg p-3 opacity-60"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2 min-w-0">
                <div
                  :class="[
                    'w-2 h-2 rounded-full shrink-0',
                    permission.isEnabled ? 'bg-success-500' : 'bg-[var(--border-strong)]'
                  ]"
                />
                <span class="font-medium text-sm text-[var(--text-primary)] truncate">
                  {{ permission.description || "Permission" }}
                </span>
                <UBadge
                  v-if="permission.role"
                  color="secondary"
                  variant="soft"
                  size="xs"
                >
                  {{ permission.role.name }}
                </UBadge>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <template v-for="m in permission.methods" :key="m.method">
                  <span
                    class="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold"
                    :class="[
                      m.method === 'GET' ? 'bg-success-500/15 text-success-600 dark:text-success-400' :
                      m.method === 'POST' ? 'bg-info-500/15 text-info-600 dark:text-info-400' :
                      m.method === 'PUT' || m.method === 'PATCH' ? 'bg-warning-500/15 text-warning-600 dark:text-warning-400' :
                      m.method === 'DELETE' ? 'bg-error-500/15 text-error-600 dark:text-error-400' :
                      'bg-[var(--surface-muted)] text-[var(--text-tertiary)]'
                    ]"
                  >
                    {{ m.method }}
                  </span>
                </template>
                <PermissionGate
                  :condition="{ or: [{ route: `/${permissionTableName}`, actions: ['delete'] }] }"
                >
                  <UButton
                    icon="lucide:trash"
                    color="error"
                    variant="ghost"
                    size="xs"
                    class="ml-1"
                    @click.stop="deletePermission(permission)"
                    :loading="deleting === permission.id"
                    :disabled="deleting === permission.id"
                  />
                </PermissionGate>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else>
        <CommonEmptyState
          title="No permissions found"
          description="No permissions found for this table. Click 'Add Permission' to create one."
          icon="lucide:shield-off"
          size="sm"
        />
      </div>
    </Transition>

      <CommonDrawer
        v-model="showDrawer"
        direction="right"
      >
        <template #header>
          <h2 class="text-lg font-semibold">{{ isEditing ? "Edit Permission" : "Create Permission" }}</h2>
        </template>

        <template #body>
          <div class="surface-card rounded-lg p-4">
            <FormEditorLazy
              v-model="permissionForm"
              v-model:errors="permissionErrors"
              @has-changed="(v: boolean) => hasFormChanges = v"
              :table-name="permissionTableName"
              :excluded="[props.currentFieldId?.field as string]"
              :field-map="fieldMap"
            />
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-3 border border-[var(--border-default)] rounded-lg p-4 surface-card">
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
              @click="savePermission"
              :loading="saving"
              :disabled="!hasFormChanges || saving"
              color="primary"
            >
              {{ isEditing ? "Update" : "Create" }}
            </UButton>
          </div>
        </template>
      </CommonDrawer>
  </div>
</template>

<script setup lang="ts">
import { UIcon } from "#components";

const notify = useNotify();
const { confirm } = useConfirm();
const { getId, getIdFieldName } = useDatabase();
const { checkPermissionCondition } = usePermissions();
const { isMounted } = useMounted();

interface Permission {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  [key: string]: any;
}

interface Props {
  tableName: string;
  currentFieldId: { field: string; value: string | number };
  icon?: string;
  title?: string;
}

const props = defineProps<Props>();

const showDrawer = ref(false);
const isEditing = ref(false);
const currentPermission = ref<Permission | null>(null);
const permissionForm = ref<Record<string, any>>({});
const permissionErrors = ref<Record<string, string>>({});
const deleting = ref<string | number | null>(null);
const hasFormChanges = ref(false);

const { useFormChanges } = useSchema();
const formChanges = useFormChanges();

const permissionTableName = computed(() => props.tableName);

const { generateEmptyForm } = useSchema(permissionTableName);

const fieldMap = {
  methods: { type: 'methods-selector' },
};

const {
  data: permissionsData,
  pending: loading,
  execute: fetchPermissions,
} = useApi(() => `/${permissionTableName.value}`, {
  query: {
    filter: {
      [props.currentFieldId.field]: {
        [getIdFieldName()]: { _eq: props.currentFieldId.value },
      },
    },
  },
  errorContext: "Fetch Permissions",
});

const {
  error: createError,
  execute: createPermission,
  pending: creating,
} = useApi(() => `/${permissionTableName.value}`, {
  method: "post",
  errorContext: "Create Permission",
});

const {
  error: updateError,
  execute: updatePermission,
  pending: updating,
} = useApi(() => `/${permissionTableName.value}`, {
  method: "patch",
  errorContext: "Update Permission",
});

const {
  error: deleteError,
  execute: deletePermissionApi,
  pending: deletePending,
} = useApi(() => `/${permissionTableName.value}`, {
  method: "delete",
  errorContext: "Delete Permission",
});

const permissions = computed(() => permissionsData.value?.data || []);
const saving = computed(() => creating.value || updating.value);

function createNewPermission() {
  if (!props.currentFieldId) {
    notify.error("Error", "Cannot create permission: missing field ID context");
    return;
  }

  isEditing.value = false;
  currentPermission.value = null;

  permissionForm.value = generateEmptyForm();

  permissionForm.value[props.currentFieldId.field] = {
    id: props.currentFieldId.value,
  };

  formChanges.update(permissionForm.value);
  hasFormChanges.value = false;
  permissionErrors.value = {};
  showDrawer.value = true;
}

function editPermission(permission: Permission) {
  isEditing.value = true;
  currentPermission.value = permission;
  permissionForm.value = { ...permission };
  formChanges.update(permission);
  hasFormChanges.value = false;
  permissionErrors.value = {};
  showDrawer.value = true;
}

async function handleReset() {
  const ok = await confirm({
    title: 'Reset Changes',
    content: 'Are you sure you want to discard all changes?',
  });
  if (!ok) return;

  if (isEditing.value && currentPermission.value) {
    permissionForm.value = formChanges.discardChanges(permissionForm.value);
  }
  hasFormChanges.value = false;
}

function closeDrawer() {
  showDrawer.value = false;
  currentPermission.value = null;
  permissionForm.value = {};
  permissionErrors.value = {};
}

async function savePermission() {
  const wasEditing = isEditing.value

  const hasRole = !!permissionForm.value.role
  const hasUsers = Array.isArray(permissionForm.value.allowedUsers) && permissionForm.value.allowedUsers.length > 0
  if (!hasRole && !hasUsers) {
    permissionErrors.value = {
      role: 'Select a role or at least one user',
      allowedUsers: 'Select a role or at least one user',
    }
    return
  }

  if (wasEditing && currentPermission.value) {
    await updatePermission({
      body: permissionForm.value,
      id: getId(currentPermission.value),
    });

    if (updateError.value) return;
  } else {
    await createPermission({
      body: permissionForm.value,
    });

    if (createError.value) return;
  }

  showDrawer.value = false;

  await fetchPermissions();

  currentPermission.value = null;
  permissionForm.value = {};
  permissionErrors.value = {};
}

async function deletePermission(permission: Permission) {
  const confirmed = await confirm({
    title: "Delete Permission",
    content:
      "Are you sure you want to delete this permission? This action cannot be undone.",
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (!confirmed) return;

  deleting.value = permission.id;
  try {
    await deletePermissionApi({ id: permission.id });

    if (deleteError.value) return;

    notify.success("Permission Deleted", "Permission has been deleted successfully");

    await fetchPermissions();
  } finally {
    deleting.value = null;
  }
}

onMounted(() => {
  fetchPermissions();
});
</script>
