<script setup lang="ts">
const props = defineProps<{
  menuId: string | number;
  isPublic?: boolean;
}>();

const notify = useNotify();
const { confirm } = useConfirm();
const { getId, getIdFieldName } = useDatabase();
const { ensureSchema, generateEmptyForm } = useSchema("enfyra_menu_permission");
const { checkPermissionCondition } = usePermissions();

const drawerOpen = ref(false);
const editingId = ref<string | number | null>(null);
const form = ref<Record<string, any>>({});
const hasChanges = ref(false);
const errors = ref<Record<string, string>>({});

const permissionCondition = (method: string) => ({
  or: [{ route: "/enfyra_menu_permission", methods: [method] }],
});

const canCreate = computed(() => checkPermissionCondition(permissionCondition("POST")));
const canUpdate = computed(() => checkPermissionCondition(permissionCondition("PATCH")));
const canDelete = computed(() => checkPermissionCondition(permissionCondition("DELETE")));

const {
  data,
  pending: loading,
  execute: fetchPermissions,
} = useApi(() => "/enfyra_menu_permission", {
  query: computed(() => ({
    fields: "id,isEnabled,role.id,role.name",
    limit: 0,
    filter: {
      menu: {
        [getIdFieldName()]: { _eq: props.menuId },
      },
    },
  })),
  errorContext: "Fetch Menu Permissions",
});

const { execute: createPermission, error: createError, pending: creating } = useApi(
  "/enfyra_menu_permission",
  { method: "post", errorContext: "Create Menu Permission" },
);
const { execute: updatePermission, error: updateError, pending: updating } = useApi(
  () => `/enfyra_menu_permission/${encodeURIComponent(String(editingId.value))}`,
  { method: "patch", errorContext: "Update Menu Permission" },
);
const { execute: deletePermission, error: deleteError } = useApi(
  () => `/enfyra_menu_permission/${encodeURIComponent(String(editingId.value))}`,
  { method: "delete", errorContext: "Delete Menu Permission" },
);

const permissions = computed(() => (data.value as any)?.data || []);
const saving = computed(() => creating.value || updating.value);

function resetForm() {
  drawerOpen.value = false;
  editingId.value = null;
  form.value = {};
  errors.value = {};
  hasChanges.value = false;
}

async function openCreate() {
  await ensureSchema();
  editingId.value = null;
  form.value = {
    ...generateEmptyForm(),
    menu: { id: props.menuId },
    isEnabled: true,
  };
  errors.value = {};
  hasChanges.value = false;
  drawerOpen.value = true;
}

function openEdit(permission: any) {
  editingId.value = getId(permission);
  form.value = JSON.parse(JSON.stringify(permission));
  errors.value = {};
  hasChanges.value = false;
  drawerOpen.value = true;
}

async function closeDrawer() {
  if (hasChanges.value) {
    const ok = await confirm({
      title: "Discard Changes",
      content: "Discard unsaved menu visibility changes?",
      confirmText: "Discard",
      cancelText: "Keep editing",
    });
    if (!ok) return;
  }
  resetForm();
}

async function save() {
  const roleId = getId(form.value.role);
  if (!roleId) {
    errors.value = { role: "Select a role" };
    return;
  }

  const body = {
    isEnabled: form.value.isEnabled !== false,
    role: { id: roleId },
    ...(editingId.value == null ? { menu: { id: props.menuId } } : {}),
  };

  if (editingId.value == null) {
    await createPermission({ body });
    if (createError.value) return;
  } else {
    await updatePermission({ body });
    if (updateError.value) return;
  }

  notify.success("Menu Permission Saved", "The role visibility rule was saved.");
  resetForm();
  await fetchPermissions();
}

async function remove(permission: any) {
  const id = getId(permission);
  if (!id) return;
  const ok = await confirm({
    title: "Remove Menu Permission",
    content: `Remove ${permission.role?.name || "this role"} from the menu?`,
    confirmText: "Remove",
    cancelText: "Cancel",
  });
  if (!ok) return;
  editingId.value = id;
  await deletePermission({});
  if (deleteError.value) return;
  await fetchPermissions();
}

function onChanged(value: boolean) {
  hasChanges.value = value;
}

onMounted(fetchPermissions);
</script>

<template>
  <CommonFormCard :bordered="false">
    <div class="flex items-center justify-between gap-3 mb-3">
      <div>
        <h3 class="text-sm font-semibold text-[var(--text-primary)]">Role visibility</h3>
        <p class="text-xs text-[var(--text-tertiary)]">Used only to show or hide this menu item.</p>
      </div>
      <PermissionGate :condition="permissionCondition('POST')">
        <UButton v-if="canCreate" icon="lucide:plus" size="sm" color="primary" @click="openCreate">
          Add role
        </UButton>
      </PermissionGate>
    </div>

    <div v-if="loading" class="text-xs text-[var(--text-tertiary)]">Loading roles...</div>
    <CommonEmptyState
      v-else-if="permissions.length === 0"
      :title="props.isPublic === false ? 'No roles assigned' : 'No role restrictions'"
      :description="props.isPublic === false ? 'No role can see this menu until a role is assigned.' : 'This menu is visible to every role while Public is enabled.'"
      icon="lucide:users"
      size="sm"
      variant="naked"
    />
    <div v-else class="space-y-2">
      <div
        v-for="permission in permissions"
        :key="getId(permission)"
        class="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-default)] px-3 py-2"
      >
        <button
          type="button"
          class="min-w-0 text-left"
          :disabled="!canUpdate"
          @click="openEdit(permission)"
        >
          <div class="text-sm font-medium text-[var(--text-primary)] truncate">{{ permission.role?.name || "Role" }}</div>
          <div class="text-xs text-[var(--text-tertiary)]">{{ permission.isEnabled === false ? "Disabled" : "Can see menu" }}</div>
        </button>
        <PermissionGate :condition="permissionCondition('DELETE')">
          <UButton
            v-if="canDelete"
            icon="lucide:trash-2"
            size="xs"
            variant="ghost"
            color="error"
            aria-label="Remove menu role"
            @click="remove(permission)"
          />
        </PermissionGate>
      </div>
    </div>
  </CommonFormCard>

  <CommonDrawer
    v-model="drawerOpen"
    direction="right"
    :cancel-action="{ label: 'Cancel', onClick: closeDrawer }"
    :primary-action="{ label: editingId == null ? 'Add' : 'Update', loading: saving, disabled: !hasChanges || saving, onClick: save }"
  >
    <template #header>
      <h2 class="text-lg font-semibold">{{ editingId == null ? "Add menu role" : "Edit menu role" }}</h2>
    </template>
    <template #body>
      <FormEditorLazy
        v-model="form"
        v-model:errors="errors"
        table-name="enfyra_menu_permission"
        :excluded="['id', '_id', 'createdAt', 'updatedAt', 'menu']"
        @has-changed="onChanged"
      />
    </template>
  </CommonDrawer>
</template>
