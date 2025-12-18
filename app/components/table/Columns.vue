<script setup lang="ts">
const props = defineProps<{
  modelValue: any[];
}>();

const isEditing = ref(false);
const editingIndex = ref<number | null>(null);
const currentColumn = ref<any>(null);
const columns = useModel(props, "modelValue");
const isNew = ref(false);
const errors = ref<Record<string, string>>({});

const { generateEmptyForm, validate } = useSchema("column_definition");
const { deleteIds, getIdFieldName, isMongoDB } = useDatabase();

const showCloseConfirm = ref(false);
const hasFormChanges = ref(false);
const formEditorRef = ref();

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

function saveColumn() {
  const customValidators = {
    name: (value: string) => {
      if (!value?.trim()) {
        return "Column name is required";
      }
      if (!TABLE_NAME_FIELD_REGEX.test(value)) {
        return "Only letters (a-z, A-Z), numbers, _ allowed and must start with a letter!";
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

  const newCol = { ...currentColumn.value };

  console.log("[Columns.saveColumn] newCol", {
    name: newCol?.name,
    type: newCol?.type,
    metadata: newCol?.metadata,
    defaultValue: newCol?.defaultValue,
  });

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
      </div>

      <UButton
        icon="lucide:trash"
        color="error"
        variant="ghost"
        size="xs"
        :disabled="column.isSystem || column.isPrimary"
        class="lg:hover:cursor-pointer mr-2"
        @click.stop="columns.splice(index, 1)"
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
      <div :class="(isMobile || isTablet) ? 'flex items-center gap-2 min-w-0 flex-1' : 'flex items-center gap-3'">
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
    </template>

      <template #body>
        <div :class="(isMobile || isTablet) ? 'space-y-3' : 'space-y-6'" v-if="currentColumn">
          
          <div
            :class="(isMobile || isTablet) ? 'bg-gradient-to-r from-background/50 to-muted/10 rounded-lg border border-gray-200 dark:border-gray-700/30 p-3 bg-white dark:bg-gray-800/50' : 'bg-gradient-to-r from-background/50 to-muted/10 rounded-xl border border-gray-200 dark:border-gray-700/30 p-6 bg-white dark:bg-gray-800/50'"
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
              :includes="
                currentColumn.name === getIdFieldName() ? ['name', 'type'] : undefined
              "
              :excluded="[
                'isSystem',
                'id',
                'createdAt',
                'updatedAt',
                'isPrimary',
                'table',
              ]"
              :field-map="typeMap"
            />
          </div>
        </div>
      </template>

      <template #footer>
        
        <div :class="(isMobile || isTablet) ? 'bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/30 p-3' : 'bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/30 p-4'">
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

    <CommonModal 
      v-model="showCloseConfirm" 
      :handle="false"
    >
      <template #title>
        <div class="text-lg font-semibold">Unsaved Changes</div>
      </template>
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-700 dark:text-gray-300 text-center">
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
