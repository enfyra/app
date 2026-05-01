<script setup lang="ts">
import { columnTypes, mongoColumnTypes } from '~/types/database';
import {
  isMongoPrimaryKeyColumn,
  normalizeMongoPrimaryKeyColumn,
} from '~/utils/schema/mongo-primary-key';

const props = defineProps<{
  modelValue: any[];
  reservedNames?: string[];
}>();

const { confirm } = useConfirm();
const isEditing = ref(false);
const editingIndex = ref<number | null>(null);
const currentColumn = ref<any>(null);
const columns = useModel(props, "modelValue");
const isNew = ref(false);
const errors = ref<Record<string, string>>({});

const { generateEmptyForm, validate } = useSchema("column_definition");
const { deleteIds, getIdFieldName, isMongoDB } = useDatabase();
const hasFormChanges = ref(false);
const formEditorRef = ref();
const localColumnsWithKeys = computed(() => columns.value.map((c: any, i: number) => ({ ...c, _localKey: i })));
const localSelfKey = computed(() => (editingIndex.value != null ? editingIndex.value : null));
const displayColumns = computed(() =>
  columns.value.map((column: any) =>
    isMongoDB.value ? normalizeMongoPrimaryKeyColumn(column) : column,
  ),
);

function getPermCount(column: any): number {
  const perms = Array.isArray(column?.fieldPermissions) ? column.fieldPermissions : [];
  return perms.length;
}

function getRuleCount(column: any): number {
  const rules = Array.isArray(column?.rules) ? column.rules : [];
  return rules.length;
}

const showPermModal = ref(false);
const permModalIndex = ref<number>(-1);
const permModalTarget = computed(() => {
  const col = columns.value?.[permModalIndex.value];
  return {
    name: col?.name || "Unnamed",
    baseline: (col?.isPublished ? "allow" : "deny") as "allow" | "deny",
  };
});

const showRuleModal = ref(false);
const ruleModalIndex = ref<number>(-1);
const ruleModalTarget = computed(() => {
  const col = columns.value?.[ruleModalIndex.value];
  return {
    name: col?.name || "Unnamed",
    type: col?.type || "varchar",
  };
});

const activeRules = computed<any[]>({
  get: () => {
    const col = columns.value?.[ruleModalIndex.value];
    return Array.isArray(col?.rules) ? col.rules : [];
  },
  set: (next: any[]) => {
    const idx = ruleModalIndex.value;
    if (idx < 0 || !columns.value?.[idx]) return;
    const nextCols = columns.value.slice();
    nextCols[idx] = { ...nextCols[idx], rules: next };
    columns.value = nextCols;
  },
});

const activePerms = computed<any[]>({
  get: () => {
    const col = columns.value?.[permModalIndex.value];
    return Array.isArray(col?.fieldPermissions) ? col.fieldPermissions : [];
  },
  set: (next: any[]) => {
    const idx = permModalIndex.value;
    if (idx < 0 || !columns.value?.[idx]) return;
    const nextCols = columns.value.slice();
    nextCols[idx] = { ...nextCols[idx], fieldPermissions: next };
    columns.value = nextCols;
  },
});

const tooltipsDisabled = computed(
  () => showPermModal.value || showRuleModal.value || isEditing.value,
);

function handleShieldClick(column: any, index: number) {
  permModalIndex.value = index;
  showPermModal.value = true;
}

function handleRuleClick(column: any, index: number) {
  ruleModalIndex.value = index;
  showRuleModal.value = true;
}

async function handleDrawerClose() {
  if (!hasFormChanges.value) return;
  isEditing.value = true;
  const ok = await confirm({
    title: "Unsaved Changes",
    content: "You have unsaved changes to this column. Are you sure you want to close? All changes will be lost.",
    confirmText: "Discard Changes",
    cancelText: "Cancel",
  });
  if (ok) discardChanges();
}

function cancelDrawer() {
  isEditing.value = false;
}

function discardChanges() {
  formEditorRef.value?.confirmChanges();
  errors.value = {};
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

function normalizeColumnForDatabase(column: any): any {
  return isMongoDB.value ? normalizeMongoPrimaryKeyColumn(column) : column;
}

function isPrimaryColumn(column: any): boolean {
  if (!column) return false;
  return isMongoDB.value
    ? isMongoPrimaryKeyColumn(column)
    : column.name === getIdFieldName() || column.isPrimary === true;
}

function editColumn(col: any, index: number) {
  isEditing.value = true;

  if (!col) return;
  editingIndex.value = index;
  currentColumn.value = normalizeColumnForDatabase({ ...toRaw(col) });

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

  const newCol = normalizeColumnForDatabase({ ...currentColumn.value });

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

  if (!currentColumn.value.type) currentColumn.value.type = "varchar";

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
    case "ObjectId":
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
  const editingPrimaryColumn = isPrimaryColumn(currentColumn.value);
  const availableColumnTypes = editingPrimaryColumn
    ? isMongoDB.value
      ? columnTypes.filter((colType) => colType.value === "ObjectId")
      : columnTypes.filter((colType) => ["uuid", "int"].includes(colType.value))
    : isMongoDB.value
      ? mongoColumnTypes
      : columnTypes.filter((colType) => colType.value !== "ObjectId");

  return {
    type: {
      type: "enum",
      options: availableColumnTypes,
      default: editingPrimaryColumn && isMongoDB.value ? "ObjectId" : undefined, 
    },
    name: {
      disabled: editingPrimaryColumn,
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
  primaryColumn.type = isMongoDB.value ? "ObjectId" : "int"; 
  primaryColumn.isPrimary = true;
  primaryColumn.isGenerated = true;
  primaryColumn.isNullable = false;
  deleteIds(primaryColumn);
  if (!columns.value.length) columns.value.push(primaryColumn);
  if (isMongoDB.value) {
    columns.value = columns.value.map((column: any) =>
      normalizeMongoPrimaryKeyColumn(column),
    );
  }
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
      v-for="(column, index) in displayColumns"
      :key="column.id ?? index"
      class="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 rounded-lg border border-muted lg:hover:bg-muted/50 transition cursor-pointer"
      @click="editColumn(column, index)"
    >
      <div class="flex items-center gap-2 min-w-0 flex-1 order-1">
        <UIcon name="lucide:type" class="w-4 h-4 text-muted-foreground shrink-0" />
        <span class="text-sm font-medium truncate flex-1 min-w-0" :title="column.name || 'Unnamed'">
          {{ column.name || "Unnamed" }}
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-1.5 basis-full lg:basis-auto order-3 lg:order-2 [&>*]:whitespace-nowrap">
        <UBadge size="xs" color="info" v-if="column.type">
          {{ column.type }}
        </UBadge>
        <UBadge size="xs" color="info" v-if="column.isNullable"
          >nullable</UBadge
        >
      </div>

      <div class="flex items-center gap-1 shrink-0 order-2 lg:order-3">
        <UTooltip
          v-if="!isPrimaryColumn(column)"
          :text="column.isPublished ? 'Published' : 'Unpublished'"
          :delay-duration="0"
          :disabled="tooltipsDisabled"
        >
          <UButton
            :icon="column.isPublished ? 'lucide:eye' : 'lucide:eye-off'"
            :color="column.isPublished ? 'success' : 'neutral'"
            variant="ghost"
            size="xs"
            class="lg:hover:cursor-pointer"
            @click.stop="column.isPublished = !column.isPublished"
          />
        </UTooltip>
        <UTooltip
          v-if="!isPrimaryColumn(column)"
          :text="`Field permissions (${getPermCount(column)})`"
          :delay-duration="0"
          :disabled="tooltipsDisabled"
        >
          <UChip
            :text="String(getPermCount(column))"
            size="md"
            color="secondary"
            :show="true"
          >
            <UButton
              icon="lucide:shield"
              color="secondary"
              variant="ghost"
              size="xs"
              class="lg:hover:cursor-pointer"
              @click.stop="handleShieldClick(column, index)"
            />
          </UChip>
        </UTooltip>
        <UTooltip
          v-if="!isPrimaryColumn(column)"
          :text="`Validation rules (${getRuleCount(column)})`"
          :delay-duration="0"
          :disabled="tooltipsDisabled"
        >
          <UChip
            :text="String(getRuleCount(column))"
            size="md"
            color="info"
            :show="true"
          >
            <UButton
              icon="lucide:ruler"
              color="info"
              variant="ghost"
              size="xs"
              class="lg:hover:cursor-pointer"
              @click.stop="handleRuleClick(column, index)"
            />
          </UChip>
        </UTooltip>
        <UButton
          icon="lucide:trash"
          color="error"
          variant="ghost"
          size="xs"
          :disabled="column.isSystem || column.isPrimary"
          class="lg:hover:cursor-pointer"
          @click.stop="removeColumn(index)"
        />
      </div>
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

  <FieldPermissionManageModal
    v-model:open="showPermModal"
    v-model:permissions="activePerms"
    target-type="column"
    :target-name="permModalTarget.name"
    :baseline="permModalTarget.baseline"
  />

  <ColumnRuleManageModal
    v-model:open="showRuleModal"
    v-model:rules="activeRules"
    :column-name="ruleModalTarget.name"
    :column-type="ruleModalTarget.type"
  />

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
                isPrimaryColumn(currentColumn) ? ['name', 'type'] : undefined
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
                'rules',
              ]"
              :field-map="typeMap"
            />
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
      </template>
    </CommonDrawer>

</template>
