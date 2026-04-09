<template>
  <div class="space-y-6">
    <div class="space-y-6">
      <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
        <CommonFormCard>
          <UForm :state="form" @submit="save">
            <FormEditorLazy
              ref="formEditorRef"
              v-model="form"
              v-model:errors="errors"
              @has-changed="(hasChanged) => hasFormChanges = hasChanged"
              :table-name="tableName"
              :excluded="['routePermissions']"
              :loading="loading"
            />
          </UForm>
        </CommonFormCard>
      </div>
    </div>

    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <template #header>
          <div class="flex items-center justify-between gap-3 w-full">
            <div class="flex items-center gap-2 min-w-0">
              <UIcon name="lucide:lock" class="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 class="text-lg font-semibold text-[var(--text-primary)]">
                Field permissions
              </h3>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                icon="lucide:plus"
                variant="soft"
                color="neutral"
                size="sm"
                @click="openCreateFieldPerm"
              >
                Create rule
              </UButton>
              <UButton
                icon="lucide:arrow-right"
                variant="soft"
                color="neutral"
                size="sm"
                @click="navigateTo(`/settings/field-permissions?role=${id}`)"
              >
                Manage
              </UButton>
            </div>
          </div>
        </template>
        <div class="text-sm text-[var(--text-tertiary)]">
          Create role-based overrides for specific columns/relations.
        </div>

        <div class="mt-4 rounded-lg border border-[var(--border-default)] p-3">
          <CommonLoadingState
            v-if="fieldPermLoading"
            title="Loading permissions..."
            size="sm"
            type="form"
            context="inline"
          />

          <div v-else class="space-y-3">
            <div v-if="fieldPermItems.length" class="space-y-2">
              <div
                v-for="it in fieldPermItems"
                :key="getId(it)"
                :class="[
                  'cursor-pointer transition-colors hover:bg-[var(--surface-muted)]',
                  String(getId(it)) === confirmDeleteFieldPermId ? 'bg-[var(--surface-muted)]' : '',
                ]"
                @click="openEditFieldPerm(it)"
              >
                <div class="flex items-start justify-between gap-3 py-2">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <UBadge
                        variant="soft"
                        :color="getFieldPermEffect(it) === 'deny' ? 'error' : 'success'"
                      >
                        {{ getFieldPermEffect(it).toUpperCase() }}
                      </UBadge>
                      <UBadge variant="soft" color="neutral">
                        {{ getFieldPermActionsLabel(it) }}
                      </UBadge>
                      <UBadge variant="soft" color="secondary">
                        {{ getFieldPermTargetLabel(it) }}
                      </UBadge>
                      <UBadge
                        v-if="it?.condition"
                        variant="soft"
                        color="info"
                      >
                        Condition
                      </UBadge>
                    </div>
                    <div
                      v-if="it?.name"
                      class="text-sm font-medium text-[var(--text-primary)] mt-2 truncate"
                    >
                      {{ it.name }}
                    </div>
                    <div v-else class="text-xs text-[var(--text-tertiary)] mt-2">
                      Click to edit this rule.
                    </div>
                  </div>

                  <UButton
                    :icon="String(getId(it)) === confirmDeleteFieldPermId ? 'lucide:check' : 'lucide:trash-2'"
                    :variant="String(getId(it)) === confirmDeleteFieldPermId ? 'solid' : 'ghost'"
                    :color="String(getId(it)) === confirmDeleteFieldPermId ? 'warning' : 'error'"
                    size="xs"
                    class="rounded-full !aspect-square flex-shrink-0"
                    :loading="String(getId(it)) === deletingFieldPermId"
                    :disabled="isFieldPermBusy"
                    @click.stop="quickDeleteFieldPerm(it)"
                  />
                </div>
              </div>
            </div>

            <CommonEmptyState
              v-else
              title="No rules yet"
              description="Create a rule to allow/deny read/create/update for this role."
              icon="lucide:lock"
              size="sm"
              variant="naked"
            />
          </div>
        </div>

        <FieldPermissionEditorDrawer
          v-model="showFieldPermDrawer"
          v-model:form="fieldPermForm"
          v-model:errors="fieldPermErrors"
          :loading="isFieldPermBusy"
          :excluded="['role', 'allowedUsers']"
          :mode="fieldPermMode"
          :title="fieldPermMode === 'update' ? 'Edit field permission' : 'Create field permission'"
          :subtitle="fieldPermMode === 'update' ? 'Update this rule for the current role' : 'This rule applies to the current role'"
          @save="saveFieldPerm"
          @cancel="showFieldPermDrawer = false"
        />
      </CommonFormCard>
    </div>

    <CommonEmptyState
      v-if="!loading && !apiData?.data?.[0]"
      title="Role not found"
      description="The requested role could not be loaded"
      icon="lucide:shield-x"
      size="sm"
    />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const toast = useToast();
const { confirm } = useConfirm();

const id = route.params.id as string;
const tableName = "role_definition";
const { getIncludeFields } = useSchema(tableName);
const { generateEmptyForm: generateFieldPermEmptyForm } = useSchema("field_permission_definition");
const { getId } = useDatabase();
const { validateFieldPermissionScope } = await import("~/utils/field-permissions/scope");
const { parseConditionJson, validateFieldPermissionCondition } = await import("~/utils/field-permissions/condition");

const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();

async function handleReset() {
  const ok = await confirm({
    title: "Reset Changes",
    content: "Are you sure you want to discard all changes? All modifications will be lost.",
  });
  if (!ok) {
    return;
  }

  if (formChanges.originalData.value) {
    form.value = formChanges.discardChanges(form.value);
    hasFormChanges.value = false;
    
    toast.add({
      title: "Reset Complete",
      color: "success",
      description: "All changes have been discarded.",
    });
  }
}

useHeaderActionRegistry([
  {
    id: "reset-role",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    order: 1,
    disabled: computed(() => !hasFormChanges.value),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "delete-role",
    label: "Delete",
    icon: "lucide:trash",
    variant: "soft",
    color: "error",
    order: 2,
    onClick: deleteRole,
    loading: computed(() => deleteLoading.value),
    disabled: computed(() => apiData.value?.data?.[0]?.isSystem ?? false),
    permission: {
      and: [
        {
          route: "/role_definition",
          actions: ["delete"],
        },
      ],
    },
  },
  {
    id: "save-role",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    order: 999,
    onClick: save,
    loading: computed(() => updateLoading.value),
    disabled: computed(() => !hasFormChanges.value),
    permission: {
      and: [
        {
          route: "/role_definition",
          actions: ["update"],
        },
      ],
    },
  },
]);

const errors = ref<Record<string, string>>({});

const { validateForm } = useFormValidation(tableName);

const {
  data: apiData,
  pending: loading,
  execute: fetchRole,
} = useApi(() => `/${tableName}`, {
  query: computed(() => ({
    fields: getIncludeFields(),
    filter: { id: { _eq: id } },
  })),
  errorContext: "Fetch Role",
});

const form = ref<Record<string, any>>({});

const showFieldPermDrawer = ref(false);
const fieldPermForm = ref<Record<string, any>>({});
const fieldPermErrors = ref<Record<string, string>>({});
const fieldPermMode = ref<"create" | "update">("create");
const editingFieldPermId = ref<string | null>(null);
const deletingFieldPermId = ref<string | null>(null);
const confirmDeleteFieldPermId = ref<string | null>(null);
let confirmDeleteFieldPermTimer: ReturnType<typeof setTimeout> | null = null;

const {
  data: fieldPermData,
  pending: fieldPermLoading,
  execute: fetchFieldPerms,
} = useApi(() => "/field_permission_definition", {
  query: computed(() => ({
    fields:
      "id,name,updatedAt,effect,decision,action,condition,table.id,table.name,column.id,column.name,relation.id,relation.propertyName,role.id,role.name",
    sort: "-updatedAt",
    limit: 100,
    filter: { role: { id: { _eq: String(id) } } },
  })),
  immediate: false,
  errorContext: "Fetch Field Permissions",
});

const fieldPermItems = computed(() => fieldPermData.value?.data || []);

const { execute: createFieldPerm, pending: createPending, error: createError } = useApi(
  () => "/field_permission_definition",
  { method: "post", errorContext: "Create Field Permission" }
);

const { execute: patchFieldPerm, pending: patchPending, error: patchError } = useApi(
  () => `/field_permission_definition/${editingFieldPermId.value || ""}`,
  { method: "patch", errorContext: "Update Field Permission", immediate: false, watch: false }
);

const { execute: deleteFieldPerm, pending: deletePending, error: deleteError2 } = useApi(
  () => "/field_permission_definition",
  { method: "delete", errorContext: "Delete Field Permission", immediate: false, watch: false }
);

const isFieldPermBusy = computed(() => createPending.value || patchPending.value || deletePending.value);

function getFieldPermEffect(item: any): string {
  return String(item?.effect ?? item?.decision ?? "allow");
}

function getFieldPermActionsLabel(item: any): string {
  const raw = item?.action ?? item?.actions ?? null;
  const actions = Array.isArray(raw) ? raw : raw != null && raw !== "" ? [raw] : [];
  return actions.length ? actions.join(", ") : "read";
}

function getFieldPermTargetLabel(item: any): string {
  if (item?.column?.name) return `Column: ${item.column.name}`;
  if (item?.relation?.propertyName) return `Relation: ${item.relation.propertyName}`;
  if (item?.table?.name) return `Table: ${item.table.name}`;
  return "Target";
}

watch(
  () => [fieldPermMode.value, editingFieldPermId.value, showFieldPermDrawer.value],
  async () => {
    if (!showFieldPermDrawer.value) return;
    const next = { ...(fieldPermErrors.value || {}) };
    delete next.role;
    fieldPermErrors.value = next;
  }
);

function openCreateFieldPerm() {
  fieldPermMode.value = "create";
  editingFieldPermId.value = null;
  const base = generateFieldPermEmptyForm();
  fieldPermForm.value = {
    ...base,
    role: { id: String(id) },
    allowedUsers: [],
  };
  fieldPermErrors.value = {};
  showFieldPermDrawer.value = true;
}

function openEditFieldPerm(item: any) {
  fieldPermMode.value = "update";
  editingFieldPermId.value = String(getId(item));
  fieldPermForm.value = JSON.parse(JSON.stringify(item || {}));
  fieldPermErrors.value = {};
  showFieldPermDrawer.value = true;
}

async function quickDeleteFieldPerm(item: any) {
  if (isFieldPermBusy.value) return;
  const rid = String(getId(item));
  if (confirmDeleteFieldPermId.value !== rid) {
    confirmDeleteFieldPermId.value = rid;
    if (confirmDeleteFieldPermTimer) clearTimeout(confirmDeleteFieldPermTimer);
    confirmDeleteFieldPermTimer = setTimeout(() => {
      if (confirmDeleteFieldPermId.value === rid) confirmDeleteFieldPermId.value = null;
      confirmDeleteFieldPermTimer = null;
    }, 4000);
    return;
  }
  deletingFieldPermId.value = rid;
  try {
    await deleteFieldPerm({ id: rid });
    if (deleteError2.value) return;
    toast.add({ title: "Success", description: "Rule deleted", color: "success" });
    confirmDeleteFieldPermId.value = null;
    await fetchFieldPerms();
  } finally {
    if (deletingFieldPermId.value === rid) deletingFieldPermId.value = null;
  }
}

async function saveFieldPerm() {
  const body: any = { ...fieldPermForm.value };
  body.role = { id: String(id) };
  body.allowedUsers = [];

  const scope = validateFieldPermissionScope(body);
  if (!scope.ok) {
    fieldPermErrors.value = { ...fieldPermErrors.value, role: scope.message };
    toast.add({ title: "Validation Error", description: scope.message, color: "error" });
    return;
  }

  if (body?.condition != null && body.condition !== "") {
    const parsed =
      typeof body.condition === "string"
        ? parseConditionJson(body.condition)
        : { condition: body.condition, error: null };
    if ((parsed as any).error) {
      toast.add({ title: "Validation Error", description: (parsed as any).error, color: "error" });
      return;
    }
    const v = validateFieldPermissionCondition((parsed as any).condition);
    if (!v.ok) {
      toast.add({ title: "Validation Error", description: v.errors[0] || "Invalid condition", color: "error" });
      return;
    }
    body.condition = (parsed as any).condition;
  } else {
    body.condition = null;
  }

  if (fieldPermMode.value === "update" && editingFieldPermId.value) {
    await patchFieldPerm({ body });
    if (patchError.value) return;
    toast.add({ title: "Success", description: "Field permission updated", color: "success" });
  } else {
    await createFieldPerm({ body });
    if (createError.value) return;
    toast.add({ title: "Success", description: "Field permission created", color: "success" });
  }
  showFieldPermDrawer.value = false;
  await fetchFieldPerms();
}

async function initializeForm() {
  await fetchRole();
  const data = apiData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
    formChanges.update(data);
  }
}

const {
  execute: updateRole,
  pending: updateLoading,
  error: updateError,
} = useApi(() => `/${tableName}/${id}`, {
  method: "patch",
  errorContext: "Update Role",
});

const {
  execute: deleteRoleApi,
  pending: deleteLoading,
  error: deleteError,
} = useApi(() => `/${tableName}/${id}`, {
  method: "delete",
  errorContext: "Delete Role",
});

async function save() {
  if (!form.value) return;

  if (!await validateForm(form.value, errors)) return;

  await updateRole({ body: form.value });

  if (updateError.value) {
    return;
  }

  toast.add({
    title: "Success",
    color: "success",
    description: "Role updated!",
  });
  errors.value = {};

  await fetchRole();
  const freshData = apiData.value?.data?.[0];
  if (freshData) {
    form.value = { ...freshData };
    formChanges.update(freshData);
  }

  formEditorRef.value?.confirmChanges();
}

async function deleteRole() {
  const ok = await confirm({
    title: "Are you sure?",
    content: "You cannot go back",
  });
  if (!ok) return;

  await deleteRoleApi();

  if (deleteError.value) {
    return;
  }

  toast.add({ 
    title: "Success",
    description: "Role deleted successfully", 
    color: "success" 
  });
  await navigateTo("/settings/roles");
}

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Role Details",
  gradient: "purple",
});

onMounted(() => {
  initializeForm();
  fetchFieldPerms();
});
</script>
