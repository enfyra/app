<template>
  <div class="space-y-6">
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
      @update:form-data="updateFormData"
      @update:errors="updateErrors"
      class="relative group"
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
  }>(),
  {
    excluded: () => [],
    includes: () => [],
    fieldMap: () => ({}),
    loading: false,
    mode: 'update',
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: Record<string, any>];
  "update:errors": [errors: Record<string, string>];
  "hasChanged": [hasChanged: boolean];
}>();

const { definition, fieldMap, sortFieldsByOrder, useFormChanges } = useSchema(
  props.tableName
);
const formChanges = useFormChanges();
const originalData = ref<Record<string, any>>({});

const fieldMapWithGenerated = computed(() => {
  const result = { ...props.fieldMap };

  // Add disabled for generated fields
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

    // Check if field is excluded in fieldMap
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

// Initialize original data when modelValue changes (first load)
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

// Watch for form changes and emit hasChanged
watch(
  () => props.modelValue,
  (newValue) => {
    if (
      newValue &&
      Object.keys(newValue).length > 0 &&
      Object.keys(originalData.value).length > 0
    ) {
      const hasChanged = formChanges.checkChanges(newValue);
      emit("hasChanged", hasChanged);
    }
  },
  { deep: true }
);



// Expose method to manually confirm form changes
defineExpose({
  confirmChanges: () => {
    if (props.modelValue && Object.keys(props.modelValue).length > 0) {
      originalData.value = JSON.parse(JSON.stringify(props.modelValue));
      formChanges.update(props.modelValue);
      emit("hasChanged", false);
    }
  },
});
</script>
