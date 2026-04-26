<template>
  <div
    v-if="!hasSections"
    :class="layoutClass"
  >
    <FormField
      v-for="field in visibleFields"
      :key="field.name || field.propertyName"
      :key-name="(field.name || field.propertyName) as string"
      :table-name="props.tableName"
      :form-data="normalizedModelValue"
      :column-map="extendedColumnMap"
      :field-map="fieldMapWithGenerated"
      :errors="errors"
      :loading="props.loading"
      :mode="props.mode"
      :is-unique-field="isUniqueFieldEffective(field.name || field.propertyName || '')"
      :unique-check-status="getCheckStatus(field.name || field.propertyName || '').status"
      :unique-check-message="getCheckStatus(field.name || field.propertyName || '').message"
      @update:form-data="updateFormData"
      @update:errors="updateErrors"
      @check-unique="handleCheckUnique"
      :class="fieldRowClass(field)"
    />
  </div>
  <div
    v-else
    class="space-y-10"
  >
    <div
      v-for="block in sectionBlocks"
      :key="block.id"
      :class="block.rootClass"
    >
      <p
        v-if="block.title && !block.hideHeading"
        :class="block.headingClass ?? defaultSectionHeadingClass"
      >
        {{ block.title }}
      </p>
      <div
        v-if="block.class"
        :class="block.class"
      >
        <div :class="layoutClass">
          <FormField
            v-for="field in block.fields"
            :key="field.name || field.propertyName"
            :key-name="(field.name || field.propertyName) as string"
            :table-name="props.tableName"
            :form-data="normalizedModelValue"
            :column-map="extendedColumnMap"
            :field-map="fieldMapWithGenerated"
            :errors="errors"
            :loading="props.loading"
            :mode="props.mode"
            :is-unique-field="isUniqueFieldEffective(field.name || field.propertyName || '')"
            :unique-check-status="getCheckStatus(field.name || field.propertyName || '').status"
            :unique-check-message="getCheckStatus(field.name || field.propertyName || '').message"
            @update:form-data="updateFormData"
            @update:errors="updateErrors"
            @check-unique="handleCheckUnique"
            :class="fieldRowClass(field)"
          />
        </div>
      </div>
      <div
        v-else
        :class="layoutClass"
      >
        <FormField
          v-for="field in block.fields"
          :key="field.name || field.propertyName"
          :key-name="(field.name || field.propertyName) as string"
          :table-name="props.tableName"
          :form-data="normalizedModelValue"
          :column-map="extendedColumnMap"
          :field-map="fieldMapWithGenerated"
          :errors="errors"
          :loading="props.loading"
          :mode="props.mode"
          :is-unique-field="isUniqueFieldEffective(field.name || field.propertyName || '')"
          :unique-check-status="getCheckStatus(field.name || field.propertyName || '').status"
          :unique-check-message="getCheckStatus(field.name || field.propertyName || '').message"
          @update:form-data="updateFormData"
          @update:errors="updateErrors"
          @check-unique="handleCheckUnique"
          :class="fieldRowClass(field)"
        />
      </div>
    </div>
    <div
      v-if="orphanSectionFields.length"
      :class="layoutClass"
    >
      <FormField
        v-for="field in orphanSectionFields"
        :key="field.name || field.propertyName"
        :key-name="(field.name || field.propertyName) as string"
        :table-name="props.tableName"
        :form-data="normalizedModelValue"
        :column-map="extendedColumnMap"
        :field-map="fieldMapWithGenerated"
        :errors="errors"
        :loading="props.loading"
        :mode="props.mode"
        :is-unique-field="isUniqueFieldEffective(field.name || field.propertyName || '')"
        :unique-check-status="getCheckStatus(field.name || field.propertyName || '').status"
        :unique-check-message="getCheckStatus(field.name || field.propertyName || '').message"
        @update:form-data="updateFormData"
        @update:errors="updateErrors"
        @check-unique="handleCheckUnique"
        :class="fieldRowClass(field)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  applyFieldPositions,
  sortDefinitionFieldsByKey,
} from '~/utils/form/field-order';
import { FORM_EDITOR_VIRTUAL_EMIT_KEY } from '~/utils/form/form-editor-context';
import type {
  FormEditorSection,
  FormEditorVirtualEmitPayload,
  FormEditorVirtualField,
} from '~/types/form-editor';

const props = withDefaults(
  defineProps<{
    modelValue: Record<string, any>;
    errors: Record<string, string>;
    tableName: string;
    excluded?: string[];
    includes?: string[];
    fieldMap?: Record<string, any>;
    virtualFields?: FormEditorVirtualField[];
    loading?: boolean;
    mode?: 'create' | 'update';
    layout?: 'stack' | 'grid';
    currentRecordId?: string | number | null;
    uniqueCheckMode?: 'api' | 'local';
    uniqueLocalRecords?: any[];
    uniqueLocalSelfKey?: string | number | null;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    fieldPositions?: Record<string, number>;
    sections?: FormEditorSection[];
  }>(),
  {
    excluded: () => [],
    includes: () => [],
    fieldMap: () => ({}),
    virtualFields: () => [],
    loading: false,
    mode: 'update',
    layout: 'stack',
    currentRecordId: null,
    uniqueCheckMode: 'api',
    uniqueLocalRecords: () => [],
    uniqueLocalSelfKey: null,
    sortOrder: 'asc',
    sections: () => [],
  }
);

const defaultSectionHeadingClass =
  'mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-quaternary)]';

const layoutClass = computed(() =>
  props.layout === 'grid'
    ? 'grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6'
    : 'space-y-6',
);

function fieldRowClass(field: { fieldType?: string }) {
  return [
    'relative group',
    props.layout === 'grid' && field.fieldType === 'relation' ? 'md:col-span-2' : '',
  ];
}

const hasSections = computed(
  () => props.sections != null && props.sections.length > 0,
);

const effectiveIncludesKeys = computed(() => {
  if (props.includes.length > 0) {
    return props.includes;
  }
  if (props.sections && props.sections.length > 0) {
    const u = new Set<string>();
    for (const s of props.sections) {
      for (const k of s.fields) {
        u.add(k);
      }
    }
    return [...u];
  }
  return [];
});

const emit = defineEmits<{
  "update:modelValue": [value: Record<string, any>];
  "update:errors": [errors: Record<string, string>];
  "hasChanged": [hasChanged: boolean];
  virtualFieldEmit: [payload: FormEditorVirtualEmitPayload];
}>();

const ALWAYS_EXCLUDED_FIELDS = new Set(["compiledCode"]);

const { definition, fieldMap: schemaColumnMap, sortFieldsByOrder, useFormChanges, schema } = useSchema(
  props.tableName
);
const { getId, getIdFieldName, isMongoDB } = useDatabase();

const normalizedModelValue = computed(() => {
  const mv = props.modelValue;
  if (!mv || typeof mv !== 'object') return mv;
  const idField = getIdFieldName();
  const altField = idField === 'id' ? '_id' : 'id';
  let result = mv;
  if (idField in mv && !(altField in mv)) {
    result = { ...mv, [altField]: mv[idField] };
  } else if (altField in mv && !(idField in mv)) {
    result = { ...mv, [idField]: mv[altField] };
  }
  return result;
});

const extendedColumnMap = computed(() => {
  const m = new Map(schemaColumnMap.value);
  for (const vf of props.virtualFields) {
    const k = vf.name || vf.propertyName;
    if (!k) continue;
    m.set(k, {
      ...vf,
      fieldType: vf.fieldType || "column",
      isVirtual: true,
    });
  }
  return m;
});

function handleVirtualFieldEmit(payload: FormEditorVirtualEmitPayload) {
  emit("virtualFieldEmit", payload);
}

provide(FORM_EDITOR_VIRTUAL_EMIT_KEY, handleVirtualFieldEmit);
const formChanges = useFormChanges();
const originalData = ref<Record<string, any>>({});

const formEditorRegistry = useFormEditorRegistry();

const currentRecordIdRef = computed(() => props.currentRecordId ?? (props.mode === 'update' ? getId(normalizedModelValue.value) : null));
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

function isUniqueCheckDisabled(key: string): boolean {
  const config = (props.fieldMap as any)?.[key];
  if (!config || typeof config !== "object") return false;
  return config.disableUniqueCheck === true;
}

function isUniqueFieldEffective(key: string): boolean {
  return isFieldInUnique(key) && !isUniqueCheckDisabled(key);
}

const filteredFormFields = computed(() => {
  const defKeys = new Set(
    definition.value
      .map((f: { name?: string; propertyName?: string }) => f.name || f.propertyName)
      .filter(Boolean) as string[],
  );
  let fields = [...definition.value];
  for (const vf of props.virtualFields) {
    const k = vf.name || vf.propertyName;
    if (!k || defKeys.has(k)) continue;
    defKeys.add(k);
    fields.push({
      ...vf,
      fieldType: vf.fieldType || "column",
      isVirtual: true,
    } as FormEditorVirtualField);
  }

  if (effectiveIncludesKeys.value.length > 0) {
    fields = fields.filter((field: any) => {
      const key = field.name || field.propertyName;
      return key && effectiveIncludesKeys.value.includes(key);
    });
  }

  fields = fields.filter((field: any) => {
    const key = field.name || field.propertyName;
    if (!key) return false;
    if (ALWAYS_EXCLUDED_FIELDS.has(key)) return false;
    if (props.excluded.includes(key)) return false;
    if (["isSystem", "isRootAdmin"].includes(key)) return false;
    return true;
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

  return fields;
});

const visibleFields = computed(() => {
  const fields = filteredFormFields.value;
  const fk = (f: { name?: string; propertyName?: string }) =>
    f.name || f.propertyName || '';
  const filteredKeys = fields.map(fk);

  if (props.loading) {
    return sortFieldsByOrder(fields);
  }

  let ordered = fields;
  if (props.sortBy && props.sortBy.length > 0) {
    ordered = sortDefinitionFieldsByKey(
      fields,
      props.sortBy,
      props.sortOrder ?? 'asc',
    );
  } else {
    ordered = sortFieldsByOrder(fields);
  }

  const afterSortKeys = ordered.map(fk);

  if (props.fieldPositions && Object.keys(props.fieldPositions).length > 0) {
    ordered = applyFieldPositions(ordered, props.fieldPositions);
  }

  return ordered;
});

const sectionBlocks = computed(() => {
  if (!props.sections || props.sections.length === 0) {
    return [];
  }
  const visibility = visibleFields.value;
  const fk = (f: { name?: string; propertyName?: string }) =>
    f.name || f.propertyName || '';
  const byKey = new Map<string, (typeof visibility)[0]>();
  for (const f of visibility) {
    const k = fk(f);
    if (k) {
      byKey.set(k, f);
    }
  }
  const assignedKeys = new Set<string>();
  const sectionFieldLists = props.sections.map((s) => {
    const list: typeof visibility = [];
    for (const key of s.fields) {
      if (assignedKeys.has(key)) {
        continue;
      }
      const f = byKey.get(key);
      if (f) {
        list.push(f);
        assignedKeys.add(key);
      }
    }
    return list;
  });
  return props.sections.map((s, i) => ({
    id: s.id,
    title: s.title,
    hideHeading: s.hideHeading,
    headingClass: s.headingClass,
    class: s.class,
    rootClass: s.rootClass,
    fields: sectionFieldLists[i]!,
  }));
});

const orphanSectionFields = computed(() => {
  if (!props.sections || props.sections.length === 0) {
    return [];
  }
  const fk = (f: { name?: string; propertyName?: string }) =>
    f.name || f.propertyName || '';
  const inSection = new Set(
    sectionBlocks.value.flatMap((b) => b.fields.map((f) => fk(f)).filter(Boolean)),
  );
  return visibleFields.value.filter((f) => {
    const k = fk(f);
    return k && !inSection.has(k);
  });
});

const fieldsInRenderOrder = computed(() => {
  if (!hasSections.value) {
    return visibleFields.value;
  }
  return [
    ...sectionBlocks.value.flatMap((b) => b.fields),
    ...orphanSectionFields.value,
  ];
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
  const firstKey = fieldsInRenderOrder.value
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
        if (newValue[key] !== oldValue[key] && isUniqueFieldEffective(key)) {
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
    if (key && isUniqueFieldEffective(key)) {
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
    if (key && isUniqueFieldEffective(key)) {
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
  emit("hasChanged", false);
  nextTick(() => {
    if (props.modelValue && Object.keys(props.modelValue).length > 0) {
      originalData.value = JSON.parse(JSON.stringify(props.modelValue));
      formChanges.update(props.modelValue);
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
