<template>
  <div :class="props.layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6' : 'space-y-6'">
    <FormField
      v-for="field in visibleFields"
      :key="field.name || field.propertyName"
      :key-name="(field.name || field.propertyName) as string"
      :form-data="modelValue"
      :column-map="fieldMap"
      :field-map="fieldMapWithGenerated"
      :errors="errors"
      :loading="props.loading"
      :mode="props.mode"
      :is-unique-field="isFieldInUnique(field.name || field.propertyName || '')"
      :unique-check-status="getCheckStatus(field.name || field.propertyName || '').status"
      :unique-check-message="getCheckStatus(field.name || field.propertyName || '').message"
      @update:form-data="updateFormData"
      @update:errors="updateErrors"
      @check-unique="handleCheckUnique"
      :class="[
        'relative group',
        props.layout === 'grid' && field.fieldType === 'relation' ? 'md:col-span-2' : ''
      ]"
    />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: Record<string, any>;
    errors: Record<string, string>;
    tableName: string;
    excluded?: string[];
    includes?: string[];
    fieldMap?: Record<string, any>;
    loading?: boolean;
    mode?: 'create' | 'update';
    layout?: 'stack' | 'grid';
    currentRecordId?: string | number | null;
    uniqueCheckMode?: 'api' | 'local';
    uniqueLocalRecords?: any[];
    uniqueLocalSelfKey?: string | number | null;
  }>(),
  {
    excluded: () => [],
    includes: () => [],
    fieldMap: () => ({}),
    loading: false,
    mode: 'update',
    layout: 'stack',
    currentRecordId: null,
    uniqueCheckMode: 'api',
    uniqueLocalRecords: () => [],
    uniqueLocalSelfKey: null,
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: Record<string, any>];
  "update:errors": [errors: Record<string, string>];
  "hasChanged": [hasChanged: boolean];
}>();

const { definition, fieldMap, sortFieldsByOrder, useFormChanges, schema } = useSchema(
  props.tableName
);
const formChanges = useFormChanges();
const originalData = ref<Record<string, any>>({});

const formEditorRegistry = useFormEditorRegistry();

const { getId } = useDatabase();
const currentRecordIdRef = computed(() => props.currentRecordId ?? (props.mode === 'update' ? getId(props.modelValue) : null));
const uniquesRef = computed(() => schema.value?.uniques || null);
const uniqueCheckModeRef = computed(() => props.uniqueCheckMode || 'api');
const uniqueLocalRecordsRef = computed(() => props.uniqueLocalRecords || []);
const uniqueLocalSelfKeyRef = computed(() => props.uniqueLocalSelfKey ?? null);

const {
  isFieldInUnique,
  getCheckStatus,
  checkUnique,
  resetCheck,
} = useUniqueCheck(
  props.tableName,
  uniquesRef,
  currentRecordIdRef,
  {
    mode: uniqueCheckModeRef,
    localRecords: uniqueLocalRecordsRef,
    localSelfKey: uniqueLocalSelfKeyRef,
  }
);

async function handleCheckUnique(fieldName: string) {
  const value = props.modelValue[fieldName];
  await checkUnique(fieldName, value, props.modelValue);
}

const fieldMapWithGenerated = computed(() => {
  const result = { ...props.fieldMap };

  for (const field of definition.value) {
    const key = field.name || field.propertyName;
    if (key && field.isGenerated === true) {
      if (result[key]) {
        result[key] = {
          ...result[key],
          disabled: true,
        };
      } else {
        result[key] = {
          disabled: true,
        };
      }
    }
  }

  return result;
});

const visibleFields = computed(() => {
  let fields = definition.value;

  const foreignKeyColumns = new Set<string>();
  fields.forEach((field: any) => {
    if (field.fieldType === "relation" && field.foreignKeyColumn) {
      foreignKeyColumns.add(field.foreignKeyColumn);
    }
  });

  if (props.includes.length > 0) {
    fields = fields.filter((field: any) => {
      const key = field.name || field.propertyName;
      return key && props.includes.includes(key);
    });
  }

  fields = fields.filter((field: any) => {
    const key = field.name || field.propertyName;
    if (!key) return false;
    if (props.excluded.includes(key)) return false;
    if (["isSystem", "isRootAdmin"].includes(key)) return false;
    if (field.fieldType === "column" && foreignKeyColumns.has(key)) return false;
    return true;
  });

  fields = fields.filter((field: any) => {
    const key = field.name || field.propertyName;
    if (!key) return false;
    if (props.loading) return true;
    if (field.fieldType === "relation") return true;

    const hasKey = key in props.modelValue;
    return hasKey;
  });

  fields = fields.filter((field: any) => {
    const key = field.name || field.propertyName;
    if (!key) return false;

    const fieldConfig = fieldMapWithGenerated.value[key];
    if (fieldConfig && fieldConfig.excluded === true) {
      return false;
    }

    return true;
  });

  return sortFieldsByOrder(fields);
});

function updateFormData(key: string, value: any) {
  const newValue = { ...props.modelValue, [key]: value };
  emit("update:modelValue", newValue);
}

function updateErrors(errors: Record<string, string>) {
  emit("update:errors", errors);
}

function scrollToFirstError() {
  const errs = props.errors || {};
  const firstKey = visibleFields.value
    .map((f: any) => f.name || f.propertyName)
    .find((k: any) => k && errs[k]);
  if (!firstKey) return;
  const el = document.querySelector(`[id^="scroll-field-${firstKey}-"]`);
  const target = (el instanceof HTMLElement) ? el : null;
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

watch(
  () => props.errors,
  async (newErrs) => {
    if (!newErrs || Object.keys(newErrs).length === 0) return;
    await nextTick();
    scrollToFirstError();
  },
  { deep: true }
);

watch(
  () => props.modelValue,
  (newValue) => {
    if (
      newValue &&
      Object.keys(newValue).length > 0 &&
      Object.keys(originalData.value).length === 0
    ) {
      originalData.value = JSON.parse(JSON.stringify(newValue));
      formChanges.update(newValue);
    }
  },
  { immediate: true, deep: true }
);

let isConfirming = false;

watch(
  () => props.modelValue,
  (newValue, oldValue) => {
    if (Object.keys(originalData.value).length === 0) {
      return;
    }

    if (isConfirming) return;

    if (
      newValue &&
      Object.keys(newValue).length > 0 &&
      Object.keys(originalData.value).length > 0
    ) {
      const hasChanged = formChanges.checkChanges(newValue);
      emit("hasChanged", hasChanged);
    }

    if (newValue && oldValue) {
      for (const key of Object.keys(newValue)) {
        if (newValue[key] !== oldValue[key] && isFieldInUnique(key)) {
          resetCheck(key);
        }
      }
    }
  },
  { deep: true }
);

function getUniqueFieldsNeedingCheck(): string[] {
  const fieldsNeedingCheck: string[] = [];
  for (const field of visibleFields.value) {
    const key = field.name || field.propertyName;
    if (key && isFieldInUnique(key)) {
      const status = getCheckStatus(key);
      if (status.status !== 'valid') {
        fieldsNeedingCheck.push(key);
      }
    }
  }
  return fieldsNeedingCheck;
}

async function validateAllUniqueFields(): Promise<boolean> {
  const allUniqueFields: string[] = [];
  for (const field of visibleFields.value) {
    const key = field.name || field.propertyName;
    if (key && isFieldInUnique(key)) {
      allUniqueFields.push(key);
    }
  }

  if (allUniqueFields.length === 0) return true;

  const results = await Promise.all(
    allUniqueFields.map(fieldName =>
      checkUnique(fieldName, props.modelValue[fieldName], props.modelValue)
    )
  );

  return results.every(result => result === true);
}

function confirmChanges() {
  isConfirming = true;
  nextTick(() => {
    if (props.modelValue && Object.keys(props.modelValue).length > 0) {
      originalData.value = JSON.parse(JSON.stringify(props.modelValue));
      formChanges.update(props.modelValue);
      emit("hasChanged", false);
    }
    isConfirming = false;
  });
}

onMounted(() => {
  formEditorRegistry.value = { validateAllUniqueFields, confirmChanges, getUniqueFieldsNeedingCheck };
});

onUnmounted(() => {
  if (formEditorRegistry.value?.validateAllUniqueFields === validateAllUniqueFields) {
    formEditorRegistry.value = null;
  }
});

defineExpose({
  confirmChanges,
  getUniqueFieldsNeedingCheck,
  validateAllUniqueFields,
});
</script>
