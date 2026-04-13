<script setup lang="ts">
import { FormTableSelect } from '#components';
import { validateFieldPermissionScope } from "~/utils/field-permissions/scope";
import { parseConditionJson, validateFieldPermissionCondition } from "~/utils/field-permissions/condition";

const props = defineProps<{
  modelValue: any[];
  tableOptions: { label: string; value: any }[];
  reservedNames?: string[];
  tableId?: number | string;
}>();

const toast = useToast();
const { confirm } = useConfirm();
const relations = useModel(props, "modelValue");

const isEditing = ref(false);
const isNew = ref(false);
const editingIndex = ref<number | null>(null);
const currentRelation = ref<any>(null);
const relationErrors = ref<Record<number, Record<string, string>>>({});

const { generateEmptyForm, validate } = useSchema("relation_definition");
const { isMobile, isTablet } = useScreen();
const { generateEmptyForm: generateFieldPermEmptyForm } = useSchema("field_permission_definition");

const showInverseModal = ref(false);
const inverseModalTarget = ref<any>(null);
const inversePropertyNameInput = ref('');

const {
  data: incomingRelData,
  execute: fetchIncomingRelations,
} = useApi(() => "/relation_definition", {
  query: computed(() => ({
    fields: 'id,propertyName,type,sourceTable.id,sourceTable.name,mappedBy.id',
    filter: props.tableId
      ? { targetTable: { id: { _eq: String(props.tableId) } } }
      : { id: { _eq: '__none__' } },
    limit: 100,
  })),
  immediate: false,
  errorContext: 'Fetch Incoming Relations',
});

const incomingRelations = computed(() => {
  if (!incomingRelData.value?.data) return [];
  const existingIds = new Set(
    relations.value
      .filter((r: any) => r.id)
      .map((r: any) => String(r.id)),
  );
  const inverseMappedIds = new Set(
    relations.value
      .filter((r: any) => r.mappedBy?.id)
      .map((r: any) => String(r.mappedBy.id)),
  );
  const pendingMappedByNames = new Set(
    relations.value
      .filter((r: any) => r.mappedBy && typeof r.mappedBy === 'string')
      .map((r: any) => r.mappedBy),
  );
  return incomingRelData.value.data.filter((r: any) => {
    if (r.mappedBy?.id) return false;
    if (existingIds.has(String(r.id))) return false;
    if (inverseMappedIds.has(String(r.id))) return false;
    if (pendingMappedByNames.has(r.propertyName)) return false;
    return true;
  });
});

function isInverseRelation(rel: any): boolean {
  if (rel.mappedBy?.id) return true;
  if (rel.mappedBy && typeof rel.mappedBy === 'string') return true;
  return false;
}

function getInverseType(type: string): string {
  if (type === 'many-to-one') return 'one-to-many';
  if (type === 'one-to-many') return 'many-to-one';
  return type;
}

function openInverseModal(incoming: any) {
  inverseModalTarget.value = incoming;
  inversePropertyNameInput.value = '';
  showInverseModal.value = true;
}

function confirmCreateInverse() {
  const incoming = inverseModalTarget.value;
  if (!incoming || !inversePropertyNameInput.value?.trim()) return;
  const name = inversePropertyNameInput.value.trim();
  if (!TABLE_NAME_FIELD_REGEX.test(name)) {
    toast.add({ title: 'Invalid name', description: 'Property name must be a valid identifier', color: 'error' });
    return;
  }
  const exists = relations.value.some((r: any) => r.propertyName === name);
  if (exists) {
    toast.add({ title: 'Duplicate', description: 'A relation with this name already exists', color: 'error' });
    return;
  }
  const inverseType = getInverseType(incoming.type);
  const sourceTableId = typeof incoming.sourceTable === 'object'
    ? incoming.sourceTable.id
    : incoming.sourceTable;
  relations.value.push({
    propertyName: name,
    type: inverseType,
    targetTable: { id: sourceTableId },
    mappedBy: incoming.propertyName,
    isNullable: true,
    isPublished: true,
  });
  showInverseModal.value = false;
  inverseModalTarget.value = null;
  inversePropertyNameInput.value = '';
}

watch(() => props.tableId, async (id) => {
  if (id) await fetchIncomingRelations();
}, { immediate: true });

const showCloseConfirm = ref(false);
const hasFormChanges = ref(false);
const formEditorRef = ref();
const localRelationsWithKeys = computed(() => relations.value.map((r: any, i: number) => ({ ...r, _localKey: i })));
const localSelfKey = computed(() => (editingIndex.value != null ? editingIndex.value : null));

const canManageFieldPermissions = computed(() => {
  return !isNew.value && !!getId(currentRelation.value);
});

function updatePublishedBaseline(v: any) {
  if (!currentRelation.value) return;
  currentRelation.value.isPublished = !!v;
  hasFormChanges.value = true;
}

const {
  data: fieldPermData,
  pending: fieldPermLoading,
  execute: fetchFieldPerms,
} = useApi(() => "/field_permission_definition", {
  query: computed(() => ({
    fields:
      "id,name,updatedAt,effect,decision,action,condition,role.id,role.name,allowedUsers.id,allowedUsers.email,allowedUsers.name,column.id,relation.id",
    sort: "-updatedAt",
    limit: 50,
    filter: canManageFieldPermissions.value
      ? { relation: { id: { _eq: String(currentRelation.value.id) } } }
      : { id: { _eq: "__none__" } },
  })),
  immediate: false,
  errorContext: "Fetch Field Permissions",
});

const fieldPermItems = computed(() => fieldPermData.value?.data || []);

const fieldPermSummaryByRelationId = computed(() => {
  const out: Record<string, { total: number; allow: number; deny: number }> = {};
  for (const rel of relations.value || []) {
    const perms: any[] = Array.isArray(rel.fieldPermissions) ? rel.fieldPermissions : [];
    if (!perms.length) continue;
    const key = String(getId(rel));
    out[key] = { total: perms.length, allow: 0, deny: 0 };
    for (const p of perms) {
      if (String(p?.effect ?? p?.decision ?? "allow") === "deny") out[key].deny += 1;
      else out[key].allow += 1;
    }
  }
  return out;
});

function syncRelationPermSummary() {
  if (!currentRelation.value) return;
  const relId = String(getId(currentRelation.value));
  const idx = relations.value.findIndex(r => String(getId(r)) === relId);
  if (idx !== -1) {
    relations.value[idx] = { ...relations.value[idx], fieldPermissions: fieldPermItems.value };
  }
}

function getFieldPermEffect(item: any): string {
  return String(item?.effect ?? item?.decision ?? "allow");
}

function getFieldPermActionsLabel(item: any): string {
  const raw = item?.action ?? item?.actions ?? null;
  const actions = Array.isArray(raw) ? raw : raw != null && raw !== "" ? [raw] : [];
  return actions.length ? actions.join(", ") : "read";
}

function getFieldPermScopeLabel(item: any): string {
  const users = item?.allowedUsers;
  if (Array.isArray(users) && users.length > 0) {
    const u = users[0];
    return u?.email ? String(u.email) : u?.name ? String(u.name) : "User";
  }
  if (item?.role?.name) return `Role: ${item.role.name}`;
  return "Scope";
}

watch(
  () => [isEditing.value, currentRelation.value?.id],
  async () => {
    if (!isEditing.value) return;
    if (!canManageFieldPermissions.value) return;
    await fetchFieldPerms();
  }
);


const showFieldPermDrawer = ref(false);
const fieldPermForm = ref<Record<string, any>>({});
const fieldPermErrors = ref<Record<string, string>>({});
const fieldPermSaving = ref(false);
const fieldPermMode = ref<"create" | "update">("create");
const editingFieldPermId = ref<string | null>(null);
const deletingFieldPermId = ref<string | null>(null);
const confirmDeleteFieldPermId = ref<string | null>(null);
let confirmDeleteFieldPermTimer: ReturnType<typeof setTimeout> | null = null;

const { execute: createFieldPerm, pending: createFieldPermPending, error: createFieldPermError } = useApi(
  () => "/field_permission_definition",
  { method: "post", errorContext: "Create Field Permission" }
);

const { execute: patchFieldPerm, pending: patchFieldPermPending, error: patchFieldPermError } = useApi(
  () => `/field_permission_definition/${editingFieldPermId.value || ""}`,
  { method: "patch", errorContext: "Update Field Permission", immediate: false, watch: false }
);

const { execute: deleteFieldPerm, pending: deleteFieldPermPending, error: deleteFieldPermError } = useApi(
  () => "/field_permission_definition",
  { method: "delete", errorContext: "Delete Field Permission", immediate: false, watch: false }
);

const isFieldPermBusy = computed(() => {
  return (
    fieldPermSaving.value ||
    createFieldPermPending.value ||
    patchFieldPermPending.value ||
    deleteFieldPermPending.value
  );
});

watch(
  () => [fieldPermForm.value?.role, fieldPermForm.value?.allowedUsers],
  () => {
    const role = fieldPermForm.value?.role;
    const users = fieldPermForm.value?.allowedUsers;
    const hasRole = role != null && role !== "";
    const hasUser = Array.isArray(users) && users.length > 0;
    if (!hasRole && !hasUser) return;
    if (!fieldPermErrors.value?.role) return;
    const next = { ...(fieldPermErrors.value || {}) };
    delete next.role;
    fieldPermErrors.value = next;
  },
  { deep: true }
);

function openCreateFieldPerm() {
  if (!canManageFieldPermissions.value) return;
  fieldPermMode.value = "create";
  editingFieldPermId.value = null;
  const base = generateFieldPermEmptyForm();
  const baselinePublished = !!currentRelation.value?.isPublished;
  const prefillEffect = baselinePublished ? "deny" : "allow";
  fieldPermForm.value = {
    ...base,
    relation: { id: String(currentRelation.value.id) },
    column: null,
    ...(base.effect !== undefined
      ? { effect: prefillEffect }
      : base.decision !== undefined
        ? { decision: prefillEffect }
        : { effect: prefillEffect }),
  };
  fieldPermErrors.value = {};
  showFieldPermDrawer.value = true;
}

function openEditFieldPerm(item: any) {
  if (!canManageFieldPermissions.value) return;
  fieldPermMode.value = "update";
  editingFieldPermId.value = String(getId(item));
  fieldPermForm.value = JSON.parse(JSON.stringify(item || {}));
  fieldPermErrors.value = {};
  showFieldPermDrawer.value = true;
}

async function quickDeleteFieldPerm(item: any) {
  if (isFieldPermBusy.value) return;
  const id = String(getId(item));

  if (confirmDeleteFieldPermId.value !== id) {
    confirmDeleteFieldPermId.value = id;
    if (confirmDeleteFieldPermTimer) clearTimeout(confirmDeleteFieldPermTimer);
    confirmDeleteFieldPermTimer = setTimeout(() => {
      if (confirmDeleteFieldPermId.value === id) confirmDeleteFieldPermId.value = null;
      confirmDeleteFieldPermTimer = null;
    }, 4000);
    return;
  }

  deletingFieldPermId.value = id;
  try {
    await deleteFieldPerm({ id });
    if (deleteFieldPermError.value) return;
    toast.add({ title: "Success", description: "Rule deleted", color: "success" });
    confirmDeleteFieldPermId.value = null;
    await fetchFieldPerms();
    syncRelationPermSummary();
  } finally {
    if (deletingFieldPermId.value === id) deletingFieldPermId.value = null;
  }
}

async function saveFieldPerm() {
  if (isFieldPermBusy.value) return;
  fieldPermSaving.value = true;
  try {
    const body: any = { ...fieldPermForm.value };

    const scope = validateFieldPermissionScope(body);
    if (!scope.ok) {
      fieldPermErrors.value = { ...fieldPermErrors.value, role: scope.message };
      toast.add({ title: "Validation Error", description: scope.message, color: "error" });
      return;
    }

    if (body?.condition != null && body.condition !== "") {
      const parsed =
        typeof body.condition === "string" ? parseConditionJson(body.condition) : { condition: body.condition, error: null };
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
      if (patchFieldPermError.value) {
        toast.add({ title: "Error", description: "Failed to update rule", color: "error" });
        return;
      }
      toast.add({ title: "Success", description: "Field permission updated", color: "success" });
    } else {
      await createFieldPerm({ body });
      if (createFieldPermError.value) {
        toast.add({ title: "Error", description: "Failed to create rule", color: "error" });
        return;
      }
      toast.add({ title: "Success", description: "Field permission created", color: "success" });
    }
    showFieldPermDrawer.value = false;
    await fetchFieldPerms();
    syncRelationPermSummary();
  } finally {
    fieldPermSaving.value = false;
  }
}

function handleDrawerClose() {
  
  if (hasFormChanges.value) {
    showCloseConfirm.value = true;
    
    isEditing.value = true;
  }
}

function cancelDrawer() {
  isEditing.value = false;
}

function discardChanges() {
  
  formEditorRef.value?.confirmChanges();
  
  relationErrors.value = {};
  showCloseConfirm.value = false;
  isEditing.value = false;
  isNew.value = false;
  currentRelation.value = null;
  editingIndex.value = null;
}

function createEmptyRelation(): any {
  return generateEmptyForm();
}

const currentRelationErrors = computed({
  get: () =>
    relationErrors.value[editingIndex.value ?? relations.value.length] || {},
  set: (val) => {
    relationErrors.value[editingIndex.value ?? relations.value.length] = val;
  },
});

function openNewRelationModal() {
  isEditing.value = true;
  isNew.value = true;
  editingIndex.value = null;
  currentRelation.value = createEmptyRelation();
}

function editRelation(rel: any, index: number) {
  isEditing.value = true;
  isNew.value = false;
  editingIndex.value = index;
  currentRelation.value = { ...toRaw(rel) };
}

async function saveRelation() {
  const rel = currentRelation.value;
  const index = editingIndex.value ?? relations.value.length;
  const customValidators = {
    propertyName: (value: string) => {
      if (!value?.trim()) return "Relation name is required";
      if (!TABLE_NAME_FIELD_REGEX.test(value.trim())) return "Invalid name";
      const trimmed = value.trim();
      const reserved = (props.reservedNames || [])
        .map((n: any) => String(n ?? '').trim())
        .filter(Boolean);
      if (reserved.includes(trimmed)) return "Field name already exists";
      return null;
    },
  };
  const { isValid, errors } = validate(rel, customValidators);

  if (!isValid) {
    relationErrors.value[index] = errors;
    return;
  }

  const uniqueOk = await formEditorRef.value?.validateAllUniqueFields?.();
  if (uniqueOk === false) {
    return;
  }

  delete relationErrors.value[index];

  const newRel = { ...rel };

  if (isNew.value) {
    relations.value.push(newRel);
  } else if (editingIndex.value != null) {
    relations.value.splice(editingIndex.value, 1, newRel);
  }

  formEditorRef.value?.confirmChanges();

  isEditing.value = false;
  currentRelation.value = null;
}

async function removeRelation(index: number) {
  const rel = relations.value?.[index];
  const displayName = String(rel?.propertyName ?? "Unnamed");
  const ok = await confirm({
    title: "Remove Relation",
    content: `Remove relation "${displayName}"? You can still cancel by discarding changes before saving.`,
  });
  if (!ok) return;
  relations.value.splice(index, 1);
}
</script>

<template>
  <div class="space-y-2 mt-6">
    <div class="flex items-center gap-2 text-lg font-semibold text-muted">
      <UIcon name="lucide:git-branch" class="w-5 h-5" />
      Relations
    </div>

    <div
      v-for="(rel, index) in relations"
      :key="rel.id ?? index"
      class="flex items-center justify-between rounded-lg border border-muted lg:hover:bg-muted/50 transition"
    >
      <div
        class="flex items-center gap-2 flex-1 cursor-pointer px-4 py-3"
        @click="editRelation(rel, index)"
      >
        <UIcon name="lucide:link" class="w-4 h-4 text-muted-foreground" />
        <span class="text-sm font-medium">
          {{ rel.propertyName || "Unnamed" }}
        </span>

        <UBadge v-if="isInverseRelation(rel)" size="xs" variant="soft" color="warning">inverse</UBadge>
        <UBadge size="xs" color="info" v-if="rel.type">{{ rel.type }}</UBadge>
        <UBadge size="xs" color="info" v-if="rel.targetTable || rel.targetTableName">
          →
          {{
            props.tableOptions.find((t) => t.value === rel.targetTable || t.value === (typeof rel.targetTable === 'object' ? rel.targetTable?.id : rel.targetTableName))
              ?.label ?? (typeof rel.targetTable === 'string' ? rel.targetTable : rel.targetTableName ?? 'Unknown')
          }}
        </UBadge>
        <UBadge size="xs" color="info" v-if="rel.isNullable">nullable</UBadge>
        <UBadge
          v-if="fieldPermSummaryByRelationId[String(getId(rel))]?.total"
          size="xs"
          variant="soft"
          color="secondary"
        >
          Perm: {{ fieldPermSummaryByRelationId[String(getId(rel))]?.total }}
        </UBadge>
        <UBadge
          v-if="fieldPermSummaryByRelationId[String(getId(rel))]?.total"
          size="xs"
          variant="soft"
          color="neutral"
        >
          A{{ fieldPermSummaryByRelationId[String(getId(rel))]?.allow }}/D{{ fieldPermSummaryByRelationId[String(getId(rel))]?.deny }}
        </UBadge>
      </div>

      <UButton
        icon="lucide:trash"
        color="error"
        variant="ghost"
        size="xs"
        :disabled="rel.isSystem"
        class="lg:hover:cursor-pointer mr-2"
        @click.stop="removeRelation(index)"
      />
    </div>

    <div
      v-for="incoming in incomingRelations"
      :key="'incoming-' + incoming.id"
      class="flex items-center justify-between rounded-lg border border-dashed border-muted opacity-60 hover:opacity-100 transition"
    >
      <div class="flex items-center gap-2 flex-1 px-4 py-3">
        <UIcon name="lucide:arrow-down-left" class="w-4 h-4 text-muted-foreground" />
        <span class="text-sm text-muted-foreground">
          {{ incoming.sourceTable?.name ?? 'unknown' }}.{{ incoming.propertyName }}
        </span>
        <UBadge size="xs" variant="soft" color="neutral">{{ incoming.type }}</UBadge>
        <UBadge size="xs" variant="soft" color="neutral">incoming</UBadge>
      </div>
      <UButton
        icon="lucide:plus"
        label="Create Inverse"
        color="primary"
        variant="soft"
        size="xs"
        class="mr-2"
        @click.stop="openInverseModal(incoming)"
      />
    </div>

    <div class="flex justify-end pt-2">
      <UButton
        icon="lucide:plus"
        label="Add Relation"
        @click.stop="openNewRelationModal()"
        class="relative z-10"
        color="primary"
        variant="solid"
        :size="(isMobile || isTablet) ? 'sm' : 'md'"
      />
    </div>
  </div>

  <CommonDrawer
    :handle="false"
    handle-only
    v-model="isEditing"
    direction="right"
    @update:model-value="(open) => { if (!open) handleDrawerClose() }"
  >
    <template #header>
      <div class="flex items-start justify-between gap-3 w-full">
        <div :class="(isMobile || isTablet) ? 'flex items-center gap-2 min-w-0 flex-1' : 'flex items-center gap-3 min-w-0 flex-1'">
        <div
          :class="(isMobile || isTablet) ? 'w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg flex-shrink-0' : 'w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg'"
        >
          <UIcon name="lucide:git-branch" :class="(isMobile || isTablet) ? 'text-xs text-white' : 'text-sm text-white'" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 :class="(isMobile || isTablet) ? 'text-base font-semibold text-foreground truncate' : 'text-xl font-semibold text-foreground'">
            {{ isNew ? "Add Relation" : "Edit Relation" }}
          </h2>
          <p :class="(isMobile || isTablet) ? 'text-xs text-muted-foreground truncate' : 'text-sm text-muted-foreground'">
            {{
              currentRelation?.propertyName ||
              "Configure relation properties"
            }}
          </p>
        </div>
      </div>
      </div>
    </template>

      <template #body>
        <div :class="(isMobile || isTablet) ? 'space-y-3' : 'space-y-6'" v-if="currentRelation">
          <div :class="(isMobile || isTablet) ? 'surface-card rounded-lg p-3' : 'surface-card rounded-xl p-6'">
            <div :class="(isMobile || isTablet) ? 'flex items-center gap-1.5 mb-3' : 'flex items-center gap-2 mb-4'">
              <UIcon name="lucide:git-branch" class="text-info" :size="(isMobile || isTablet) ? '16' : '18'" />
              <h3 :class="(isMobile || isTablet) ? 'text-sm font-semibold text-foreground' : 'text-lg font-semibold text-foreground'">
                Relation Properties
              </h3>
            </div>
            <TableInverseRelationInfo
              v-if="isInverseRelation(currentRelation)"
              class="mb-5 md:mb-6"
              :relation="currentRelation"
              :table-options="tableOptions"
            />
            <FormEditorLazy
              ref="formEditorRef"
              v-model="currentRelation"
              v-model:errors="currentRelationErrors"
              tableName="relation_definition"
              @has-changed="(hasChanged) => hasFormChanges = hasChanged"
              unique-check-mode="local"
              :unique-local-records="localRelationsWithKeys"
              :unique-local-self-key="localSelfKey"
              :excluded="isInverseRelation(currentRelation) ? [
                'id', 'createdAt', 'updatedAt', 'isSystem', 'isPublished',
                'sourceTable', 'junctionTableName', 'junctionSourceColumn', 'junctionTargetColumn',
                'type', 'targetTable', 'isNullable', 'isUpdatable', 'mappedBy', 'onDelete', 'metadata',
                'fieldPermissions'
              ] : [
                'id', 'createdAt', 'updatedAt', 'isSystem', 'isPublished',
                'sourceTable', 'junctionTableName', 'junctionSourceColumn', 'junctionTargetColumn',
                'mappedBy',
                'fieldPermissions'
              ]"
              :field-map="{
                type: {
                  type: 'enum',
                  options: relationTypes,
                },
                targetTable: {
                  component: FormTableSelect,
                },
              }"
            />
            <TableInverseToggle
              v-if="!isInverseRelation(currentRelation) && !currentRelation?.id"
              v-model="currentRelation.inversePropertyName"
              class="mt-3"
            />
          </div>

          <div
            v-if="canManageFieldPermissions"
            :class="(isMobile || isTablet) ? 'surface-card rounded-lg p-3' : 'surface-card rounded-xl p-6'"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2 min-w-0">
                <UIcon name="lucide:lock" class="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-[var(--text-primary)] truncate">
                    Field permissions
                  </div>
                  <div class="text-xs text-[var(--text-tertiary)] truncate">
                    Relation: {{ currentRelation?.propertyName }}
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 flex-shrink-0">
                <UButton
                  variant="soft"
                  color="neutral"
                  size="sm"
                  icon="lucide:plus"
                  @click="openCreateFieldPerm"
                >
                  Create rule
                </UButton>
              </div>
            </div>

            <div class="mt-4 space-y-3">
              <div class="rounded-lg border border-[var(--border-default)] p-3 surface-muted">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                      Published baseline
                    </div>
                    <div class="text-sm font-medium text-[var(--text-primary)] mt-1">
                      {{ currentRelation?.isPublished ? "Published" : "Unpublished" }}
                    </div>
                    <div class="text-xs text-[var(--text-tertiary)] mt-1">
                      Unpublished masks reads to <span class="font-mono">null</span> and blocks query operators and writes (403) unless overridden.
                    </div>
                  </div>

                  <USwitch
                    :model-value="!!currentRelation?.isPublished"
                    @update:model-value="updatePublishedBaseline"
                  />
                </div>
              </div>

              <div class="rounded-lg border border-[var(--border-default)] p-3">
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
                      :key="`fp-${String(getId(it) ?? '')}`"
                      :class="[
                        'cursor-pointer transition-colors rounded-lg px-3',
                        'border border-[var(--border-default)]',
                        'hover:bg-[var(--surface-muted)]',
                        String(getId(it)) === confirmDeleteFieldPermId ? 'bg-[var(--surface-muted)]' : '',
                      ]"
                      @click="openEditFieldPerm(it)"
                    >
                      <div class="flex items-start justify-between gap-3 py-3">
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
                              {{ getFieldPermScopeLabel(it) }}
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
                    description="Create a rule to allow/deny read/create/update for this relation."
                    icon="lucide:lock"
                    size="sm"
                    variant="naked"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        
        <div
          :class="(isMobile || isTablet) ? 'surface-card rounded-lg p-3 w-full' : 'surface-card rounded-xl p-4 w-full'"
        >
          <div class="flex items-center justify-between w-full">
            <div v-if="!isMobile && !isTablet" class="flex items-center gap-2">
              <UIcon
                name="lucide:info"
                class="text-muted-foreground"
                size="16"
              />
              <span class="text-sm text-muted-foreground">
                {{
                  isNew
                    ? "Ready to create new relation?"
                    : "Ready to update relation?"
                }}
              </span>
            </div>
            <div :class="(isMobile || isTablet) ? 'flex gap-1.5 w-full justify-end' : 'flex gap-3'">
              <UButton
                icon="lucide:check"
                @click="saveRelation()"
                color="primary"
                :loading="false"
                :size="(isMobile || isTablet) ? 'sm' : 'md'"
                :class="(isMobile || isTablet) ? 'rounded-full !aspect-square' : ''"
              >
                <span v-if="!isMobile && !isTablet">{{ isNew ? "Create Relation" : "Update Relation" }}</span>
              </UButton>
            </div>
          </div>
        </div>

        <FieldPermissionEditorDrawer
          v-model="showFieldPermDrawer"
          v-model:form="fieldPermForm"
          v-model:errors="fieldPermErrors"
          nested
          :loading="isFieldPermBusy"
          :excluded="['column', 'relation', 'table']"
          :mode="fieldPermMode"
          :title="fieldPermMode === 'update' ? 'Edit field permission' : 'Create field permission'"
          :subtitle="fieldPermMode === 'update' ? 'Update this rule for the current relation' : 'This rule applies to the current relation'"
          @save="saveFieldPerm"
          @cancel="showFieldPermDrawer = false"
        />
      </template>
    </CommonDrawer>

    <CommonModal
      v-model="showCloseConfirm"
      :handle="false"
    >
      <template #title>
        <div class="text-lg font-semibold">Unsaved Changes</div>
      </template>
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-[var(--text-secondary)] text-center">
            You have unsaved changes to this relation. Are you sure you want to close? All changes will be lost.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" @click="showCloseConfirm = false">
            Cancel
          </UButton>
          <UButton @click="discardChanges">
            Discard Changes
          </UButton>
        </div>
      </template>
    </CommonModal>

    <CommonModal
      v-model="showInverseModal"
      :handle="false"
    >
      <template #title>
        <div class="text-lg font-semibold">Create Inverse Relation</div>
      </template>
      <template #body>
        <div class="space-y-4" v-if="inverseModalTarget">
          <p class="text-sm text-[var(--text-secondary)]">
            Create an inverse for
            <span class="font-semibold text-[var(--text-primary)]">{{ inverseModalTarget.sourceTable?.name }}.{{ inverseModalTarget.propertyName }}</span>
            ({{ inverseModalTarget.type }})
          </p>
          <p class="text-sm text-[var(--text-secondary)]">
            This will create a <span class="font-semibold">{{ getInverseType(inverseModalTarget.type) }}</span> relation on this table.
          </p>
          <UFormField label="Property Name" required class="w-full">
            <UInput
              v-model="inversePropertyNameInput"
              placeholder="e.g. orders, comments, children"
              autofocus
              class="w-full"
              @keydown.enter="confirmCreateInverse"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" @click="showInverseModal = false">
            Cancel
          </UButton>
          <UButton
            color="primary"
            :disabled="!inversePropertyNameInput?.trim()"
            @click="confirmCreateInverse"
          >
            Create
          </UButton>
        </div>
      </template>
    </CommonModal>

</template>
