<script setup lang="ts">
const props = defineProps<{
  modelValue: any[];
  reservedNames?: string[];
}>();

const toast = useToast();
const { confirm } = useConfirm();
const isEditing = ref(false);
const editingIndex = ref<number | null>(null);
const currentColumn = ref<any>(null);
const columns = useModel(props, "modelValue");
const isNew = ref(false);
const errors = ref<Record<string, string>>({});

const { generateEmptyForm, validate } = useSchema("column_definition");
const { deleteIds, getIdFieldName, isMongoDB } = useDatabase();
const { generateEmptyForm: generateFieldPermEmptyForm } = useSchema("field_permission_definition");
import { validateFieldPermissionScope } from "~/utils/field-permissions/scope";
import { parseConditionJson, validateFieldPermissionCondition } from "~/utils/field-permissions/condition";

const showCloseConfirm = ref(false);
const hasFormChanges = ref(false);
const formEditorRef = ref();
const localColumnsWithKeys = computed(() => columns.value.map((c: any, i: number) => ({ ...c, _localKey: i })));
const localSelfKey = computed(() => (editingIndex.value != null ? editingIndex.value : null));

const canManageFieldPermissions = computed(() => {
  return editingIndex.value !== null && !!getId(currentColumn.value);
});

function updatePublishedBaseline(v: any) {
  if (!currentColumn.value) return;
  currentColumn.value.isPublished = !!v;
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
      ? { column: { id: { _eq: String(currentColumn.value.id) } } }
      : { id: { _eq: "__none__" } },
  })),
  immediate: false,
  errorContext: "Fetch Field Permissions",
});

const fieldPermItems = computed(() => fieldPermData.value?.data || []);

const fieldPermSummaryByColumnId = computed(() => {
  const out: Record<string, { total: number; allow: number; deny: number }> = {};
  for (const col of columns.value || []) {
    const perms: any[] = Array.isArray(col.fieldPermissions) ? col.fieldPermissions : [];
    if (!perms.length) continue;
    const key = String(getId(col));
    out[key] = { total: perms.length, allow: 0, deny: 0 };
    for (const p of perms) {
      if (String(p?.effect ?? p?.decision ?? "allow") === "deny") out[key].deny += 1;
      else out[key].allow += 1;
    }
  }
  return out;
});

function syncColumnPermSummary() {
  if (!currentColumn.value) return;
  const colId = String(getId(currentColumn.value));
  const idx = columns.value.findIndex(c => String(getId(c)) === colId);
  if (idx !== -1) {
    columns.value[idx] = { ...columns.value[idx], fieldPermissions: fieldPermItems.value };
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
  () => [isEditing.value, currentColumn.value?.id],
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
  const baselinePublished = !!currentColumn.value?.isPublished;
  const prefillEffect = baselinePublished ? "deny" : "allow";
  fieldPermForm.value = {
    ...base,
    column: { id: String(currentColumn.value.id) },
    relation: null,
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
    syncColumnPermSummary();
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
    syncColumnPermSummary();
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
  
  errors.value = {};
  showCloseConfirm.value = false;
  isEditing.value = false;
  isNew.value = false;
  currentColumn.value = null;
  editingIndex.value = null;
}

function handleUuidType(column: any): any {
  if (column.type === "uuid") {
    column.isGenerated = true;
    delete column.defaultValue;
  }
  return column;
}

function createEmptyColumn(): any {
  return generateEmptyForm();
}

function editColumn(col: any, index: number) {
  isEditing.value = true;

  if (!col) return;
  editingIndex.value = index;
  currentColumn.value = { ...toRaw(col) };

  if (isMongoDB.value && currentColumn.value.name === getIdFieldName()) {
    currentColumn.value.type = "uuid";
  }

  handleUuidType(currentColumn.value);
}

async function saveColumn() {
  const customValidators = {
    name: (value: string) => {
      if (!value?.trim()) {
        return "Column name is required";
      }
      if (!TABLE_NAME_FIELD_REGEX.test(value)) {
        return "Only letters (a-z, A-Z), numbers, _ allowed and must start with a letter!";
      }
      const trimmed = value.trim();
      const reserved = (props.reservedNames || [])
        .map((n: any) => String(n ?? '').trim())
        .filter(Boolean)
      if (reserved.includes(trimmed)) {
        return "Field name already exists";
      }
      return null;
    },
    type: (value: string) => {
      if (!value) {
        return "Must select data type";
      }
      return null;
    }
  };

  const { isValid, errors: validationErrors } = validate(currentColumn.value, customValidators);
  
  if (!isValid) {
    errors.value = validationErrors;
    return;
  }

  const uniqueOk = await formEditorRef.value?.validateAllUniqueFields?.();
  if (uniqueOk === false) {
    return;
  }

  const newCol = { ...currentColumn.value };

  handleUuidType(newCol);

  if (isNew.value) {
    columns.value.push(newCol);
  } else if (editingIndex.value != null) {
    columns.value.splice(editingIndex.value, 1, newCol);
  }

  formEditorRef.value?.confirmChanges();
  
  isEditing.value = false;
  isNew.value = false;
  currentColumn.value = null;
  editingIndex.value = null;
}

function addNewColumn() {
  isNew.value = true;
  isEditing.value = true;
  currentColumn.value = createEmptyColumn();
  currentColumn.value.isNullable = true;
  currentColumn.value.isUpdatable = true;
  currentColumn.value.isPrimary = false; 
  currentColumn.value.isGenerated = false; 
  currentColumn.value.isSystem = false; 
  editingIndex.value = null;
  deleteIds(currentColumn.value);

  if (!currentColumn.value.type) {
    currentColumn.value.type = isMongoDB.value ? "uuid" : "varchar";
  }

  handleUuidType(currentColumn.value);
}

async function removeColumn(index: number) {
  const col = columns.value?.[index];
  const displayName = String(col?.name ?? "Unnamed");
  const ok = await confirm({
    title: "Remove Column",
    content: `Remove column "${displayName}"? You can still cancel by discarding changes before saving.`,
  });
  if (!ok) return;
  columns.value.splice(index, 1);
}

function getUuidTypeMap() {
  return {
    defaultValue: {
      type: "text",
      disabled: true,
      placeholder: "Auto-generated UUID",
    },
    isGenerated: {
      type: "boolean",
      disabled: true,
      default: true,
    },
    options: {
      excluded: true,
    },
  };
}

function getArrayEnumTypeMap(currentType: string, options: any[]) {
  return {
    options: {
      type: "array-tags",
    },
    defaultValue: {
      type: currentType,
      options,
      ...(!options?.length && {
        excluded: true,
      }),
    },
  };
}

const { isMobile, isTablet } = useScreen();

function getDefaultValueType(columnType: string) {
  switch (columnType) {
    case "boolean":
      return "boolean";

    case "int":
    case "float":
      return "number";

    case "date":
      return "date";

    case "text":
    case "richtext":
    case "varchar":
    case "uuid":
      return "text";

    case "code":
    case "simple-json":
      return "code";

    case "array-select":
      return "array-select";

    case "enum":
      return "enum";

    default:
      return "text";
  }
}

const typeMap = computed(() => {
  const currentType = currentColumn.value?.type;
  const isPrimaryColumn = currentColumn.value?.name === getIdFieldName();

  return {
    type: {
      type: "enum",
      options:
        isPrimaryColumn
          ? isMongoDB.value
            ? columnTypes.filter((colType) => colType.value === "uuid") 
            : columnTypes.filter((colType) => ["uuid", "int"].includes(colType.value)) 
          : columnTypes,
      default: isPrimaryColumn && isMongoDB.value ? "uuid" : undefined, 
    },
    name: {
      disabled: currentColumn.value?.name === getIdFieldName(),
    },
    defaultValue: getDefaultValueType(currentType),
    
    ...(currentType === "uuid" && getUuidTypeMap()),
    
    ...(["array-select", "enum"].includes(currentType) &&
      getArrayEnumTypeMap(currentType, currentColumn.value?.options)),

    ...(currentType === "text" && {
      defaultValue: {
        excluded: true,
      },
    }),

    ...(currentType === "simple-json" && {
      defaultValue: {
        type: "code",
        componentProps: {
          language: "json",
        },
      },
    }),

    ...(!["array-select", "enum"].includes(currentType) &&
      currentType !== "uuid" && {
        options: {
          excluded: true,
        },
      }),
  };
});

onMounted(() => {
  const primaryColumn = createEmptyColumn();
  const { getIdFieldName, isMongoDB } = useDatabase();
  primaryColumn.name = getIdFieldName();
  primaryColumn.type = isMongoDB.value ? "uuid" : "int"; 
  primaryColumn.isPrimary = true;
  primaryColumn.isGenerated = true;
  primaryColumn.isNullable = false;
  deleteIds(primaryColumn);
  if (!columns.value.length) columns.value.push(primaryColumn);
});

function handleTypeChange(newType: string, oldType: string) {
  if (!currentColumn.value) return;

  if (newType === "uuid" && oldType !== "uuid") {
    handleUuidType(currentColumn.value);
  } else if (oldType === "uuid" && newType !== "uuid") {
    currentColumn.value.isGenerated = false;
    const defaultValueType = getDefaultValueType(newType);
    if (defaultValueType) {
      currentColumn.value.defaultValue = null;
    }
  }
}

function handleOptionsChange(currentType: string, newOptions: any[]) {
  if (!currentColumn.value) return;
  if (!["array-select", "enum"].includes(currentType)) return;

  if (!newOptions || newOptions.length === 0) {
    if (currentColumn.value.defaultValue) {
      delete currentColumn.value.defaultValue;
    }
    return;
  }

  if (currentColumn.value.defaultValue) {
    if (currentType === "array-select") {
      
      if (Array.isArray(currentColumn.value.defaultValue)) {
        currentColumn.value.defaultValue =
          currentColumn.value.defaultValue.filter((value: any) => {
            const val = typeof value === "object" ? value.value : value;
            return newOptions.includes(val);
          });
      }
    } else if (currentType === "enum") {
      
      const val =
        typeof currentColumn.value.defaultValue === "object"
          ? currentColumn.value.defaultValue.value
          : currentColumn.value.defaultValue;

      if (!newOptions.includes(val)) {
        currentColumn.value.defaultValue = null;
      }
    }
  }
}

watch(
  () => [currentColumn.value?.type, currentColumn.value?.options],
  ([newType, newOptions], [oldType]) => {
    if (newType !== oldType) {
      handleTypeChange(newType, oldType);
    }

    if (newType && ["array-select", "enum"].includes(newType)) {
      handleOptionsChange(newType, newOptions);
    }
  },
  { deep: true }
);
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-2 text-lg font-semibold text-muted">
      <UIcon name="lucide:columns" class="w-5 h-5" />
      Columns
    </div>
    <div
      v-for="(column, index) in columns"
      :key="column.id ?? index"
      class="flex items-center justify-between rounded-lg border border-muted lg:hover:bg-muted/50 transition"
    >
      
      <div
        class="flex items-center gap-2 flex-1 cursor-pointer px-4 py-3"
        @click="editColumn(column, index)"
      >
        <UIcon name="lucide:type" class="w-4 h-4 text-muted-foreground" />
        <span class="text-sm font-medium">
          {{ column.name || "Unnamed" }}
        </span>

        <UBadge size="xs" color="info" v-if="column.type">
          {{ column.type }}
        </UBadge>
        <UBadge size="xs" color="info" v-if="column.isNullable"
          >nullable</UBadge
        >
        <UBadge
          v-if="fieldPermSummaryByColumnId[String(getId(column))]?.total"
          size="xs"
          variant="soft"
          color="secondary"
        >
          Perm: {{ fieldPermSummaryByColumnId[String(getId(column))]?.total }}
        </UBadge>
        <UBadge
          v-if="fieldPermSummaryByColumnId[String(getId(column))]?.total"
          size="xs"
          variant="soft"
          color="neutral"
        >
          A{{ fieldPermSummaryByColumnId[String(getId(column))]?.allow }}/D{{ fieldPermSummaryByColumnId[String(getId(column))]?.deny }}
        </UBadge>
      </div>

      <UButton
        icon="lucide:trash"
        color="error"
        variant="ghost"
        size="xs"
        :disabled="column.isSystem || column.isPrimary"
        class="lg:hover:cursor-pointer mr-2"
        @click.stop="removeColumn(index)"
      />
    </div>

    <div class="flex justify-end pt-2">
      <UButton
        icon="lucide:plus"
        label="Add Column"
        @click="addNewColumn()"
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
          <UIcon name="lucide:columns" :class="(isMobile || isTablet) ? 'text-xs text-white' : 'text-sm text-white'" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 :class="(isMobile || isTablet) ? 'text-base font-semibold text-foreground truncate' : 'text-xl font-semibold text-foreground'">
            {{ editingIndex !== null ? "Edit Column" : "New Column" }}
          </h2>
          <p :class="(isMobile || isTablet) ? 'text-xs text-muted-foreground truncate' : 'text-sm text-muted-foreground'">
            {{ currentColumn?.name || "Configure column properties" }}
          </p>
        </div>
      </div>
      </div>
    </template>

      <template #body>
        <div :class="(isMobile || isTablet) ? 'space-y-3' : 'space-y-6'" v-if="currentColumn">
          
          <div
            :class="(isMobile || isTablet) ? 'surface-card rounded-lg p-3' : 'surface-card rounded-xl p-6'"
          >
            <div :class="(isMobile || isTablet) ? 'flex items-center gap-1.5 mb-3' : 'flex items-center gap-2 mb-4'">
              <UIcon name="lucide:edit-3" class="text-info" :size="(isMobile || isTablet) ? '16' : '18'" />
              <h3 :class="(isMobile || isTablet) ? 'text-sm font-semibold text-foreground' : 'text-lg font-semibold text-foreground'">
                Column Properties
              </h3>
            </div>
            <FormEditorLazy
              ref="formEditorRef"
              v-model="currentColumn"
              tableName="column_definition"
              v-model:errors="errors"
              @has-changed="(hasChanged) => hasFormChanges = hasChanged"
              unique-check-mode="local"
              :unique-local-records="localColumnsWithKeys"
              :unique-local-self-key="localSelfKey"
              :includes="
                currentColumn.name === getIdFieldName() ? ['name', 'type'] : undefined
              "
              :excluded="[
                'isSystem',
                'id',
                'createdAt',
                'updatedAt',
                'isPublished',
                'isPrimary',
                'table',
                'fieldPermissions',
              ]"
              :field-map="typeMap"
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
                    Column: {{ currentColumn?.name }}
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
                      {{ currentColumn?.isPublished ? "Published" : "Unpublished" }}
                    </div>
                    <div class="text-xs text-[var(--text-tertiary)] mt-1">
                      Unpublished masks reads to <span class="font-mono">null</span> and blocks query operators and writes (403) unless overridden.
                    </div>
                  </div>

                  <USwitch
                    :model-value="!!currentColumn?.isPublished"
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
                    description="Create a rule to allow/deny read/create/update for this column."
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
        
        <div :class="(isMobile || isTablet) ? 'surface-card rounded-lg p-3' : 'surface-card rounded-xl p-4'">
          <div class="flex items-center justify-between">
            <div v-if="!isMobile && !isTablet" class="flex items-center gap-2">
              <UIcon
                name="lucide:info"
                class="text-muted-foreground"
                size="16"
              />
              <span class="text-sm text-muted-foreground">
                {{
                  editingIndex !== null
                    ? "Ready to update column?"
                    : "Ready to create new column?"
                }}
              </span>
            </div>
            <div :class="(isMobile || isTablet) ? 'flex gap-1.5 w-full justify-end' : 'flex gap-3'">
              <UButton
                icon="lucide:check"
                @click="saveColumn()"
                color="primary"
                :loading="false"
                :size="(isMobile || isTablet) ? 'sm' : 'md'"
                :class="(isMobile || isTablet) ? 'rounded-full !aspect-square' : ''"
              >
                <span v-if="!isMobile && !isTablet">{{ editingIndex !== null ? "Update Column" : "Create Column" }}</span>
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
          :subtitle="fieldPermMode === 'update' ? 'Update this rule for the current column' : 'This rule applies to the current column'"
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
            You have unsaved changes to this column. Are you sure you want to close? All changes will be lost.
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

</template>
