<script setup lang="ts">
// Vue functions are auto-imported
import {
  UInput,
  UTextarea,
  USwitch,
  FormDateField,
  USelect,
  UFormField,
} from "#components";

import FieldLoadingSkeleton from "./FieldLoadingSkeleton.vue";

const props = defineProps<{
  keyName: string;
  formData: Record<string, any>;
  columnMap: Map<string, any>;
  fieldMap?: Record<string, any>;
  errors: Record<string, string>;
  readonly?: boolean;
  loading?: boolean;
}>();

const emit = defineEmits<{
  "update:formData": [key: string, value: any];
  "update:errors": [errors: Record<string, string>];
}>();

function updateFormData(key: string, value: any) {
  const column = props.columnMap.get(key);
  const manualConfig = props.fieldMap?.[key];
  const config =
    typeof manualConfig === "string"
      ? { type: manualConfig }
      : manualConfig || {};
  const finalType = config.type || column?.type;

  // Convert empty string to null for string fields (input/textarea)
  if (typeof value === "string" && value.trim() === "") {
    const stringTypes = ["varchar", "text", "uuid", "richtext", "code", "simple-json"];
    // If field type is string type or undefined (defaults to varchar), convert to null
    if (!finalType || stringTypes.includes(finalType)) {
      value = null;
    }
  }

  emit("update:formData", key, value);
}

function updateErrors(errors: Record<string, string>) {
  emit("update:errors", errors);
}

function getComponentConfigByKey(key: string) {
  const column = props.columnMap.get(key);
  const isRelation = column?.fieldType === "relation";

  const manualConfig = props.fieldMap?.[key];
  const config =
    typeof manualConfig === "string"
      ? { type: manualConfig }
      : manualConfig || {};

  const finalType = config.type || column?.type;
  const isSystemField = key === "createdAt" || key === "updatedAt";
  const disabled = config.disabled ?? isSystemField;
  const hasError = !!props.errors?.[key];

  const fieldProps = {
    ...config.fieldProps,
  };

  const componentPropsBase = {
    disabled,
    placeholder: config.placeholder || column?.placeholder || key,
    class: "w-full",
    ...config.componentProps,
    ...(hasError && { error: props.errors[key] }),
  };

  // Handle special cases first
  if (isRelation) {
    return {
      component: resolveComponent("FormRelationInlineEditor"),
      componentProps: {
        ...componentPropsBase,
        relationMeta: column,
        modelValue: ensureNotNull(props.formData[key]),
        "onUpdate:modelValue": (val: any) => {
          updateFormData(key, val);
        },
        ...(hasError && { error: props.errors[key] }),
      },
      fieldProps,
    };
  }

  // Switch case for different field types
  switch (finalType) {
    case "boolean":
      return {
        component: USwitch,
        componentProps: {
          ...componentPropsBase,
          modelValue: ensureBoolean(props.formData[key]),
          "onUpdate:modelValue": (val: boolean) => {
            updateFormData(key, val);
          },
        },
        fieldProps,
      };
    case "enum": {
      let items = config.options || column?.options || [];
      
      if (config.excludedOptions && Array.isArray(config.excludedOptions)) {
        items = items.filter((item: any) => !config.excludedOptions.includes(item));
      }
      
      if (config.includedOptions && Array.isArray(config.includedOptions)) {
        items = items.filter((item: any) => config.includedOptions.includes(item));
      }

      return {
        component: USelect,
        componentProps: {
          ...componentPropsBase,
          items: items,
          modelValue: ensureNotNull(props.formData[key]),
          "onUpdate:modelValue": (val: any) => {
            updateFormData(key, val);
          },
        },
        fieldProps,
      };
    }
    case "array-select": {
      let items = config.options || column?.options || [];
      
      if (config.excludedOptions && Array.isArray(config.excludedOptions)) {
        items = items.filter((item: any) => !config.excludedOptions.includes(item));
      }
      
      if (config.includedOptions && Array.isArray(config.includedOptions)) {
        items = items.filter((item: any) => config.includedOptions.includes(item));
      }

      return {
        component: USelect,
        componentProps: {
          ...componentPropsBase,
          items: items,
          modelValue: ensureNotNull(props.formData[key]),
          "onUpdate:modelValue": (val: any) => {
            updateFormData(key, val);
          },
          multiple: true,
        },
        fieldProps,
      };
    }

    case "simple-json":
      // If field is disabled, show disabled input instead of code editor
      if (disabled) {
        return {
          component: UInput,
          componentProps: {
            ...componentPropsBase,
            type: "text",
            modelValue: ensureString(props.formData[key]),
            "onUpdate:modelValue": (val: string) => {
              updateFormData(key, val);
            },
          },
          fieldProps: {
            ...fieldProps,
            class: "col-span-2",
          },
        };
      }

      return {
        component: resolveComponent("FormCodeEditorLazy"),
        componentProps: {
          ...componentPropsBase,
          modelValue: ensureString(props.formData[key]),
          language: "json",
          height: config.height || "300px",
          "onUpdate:modelValue": (val: string) => {
            updateFormData(key, val);
          },
          onDiagnostics: (diags: any[]) => {
            const updated = { ...props.errors };
            if (diags?.length > 0) {
              updated[key] = "JSON syntax error";
            } else {
              delete updated[key];
            }
            updateErrors(updated);
          },
          ...(hasError && { error: props.errors[key] }),
        },
        fieldProps: {
          ...fieldProps,
          class: "col-span-2",
        },
      };

    case "text":
      return {
        component: UTextarea,
        componentProps: {
          ...componentPropsBase,
          rows: 4,
          variant: "subtle",
          autoresize: true,
          class: "w-full font-mono text-xs",
          modelValue: ensureString(props.formData[key]),
          "onUpdate:modelValue": (val: string) => {
            updateFormData(key, val);
          },
        },
        fieldProps: {
          ...fieldProps,
          class: "col-span-2",
        },
      };

    case "number":
      return {
        component: UInput,
        componentProps: {
          ...componentPropsBase,
          type: "number",
          modelValue: ensureNumber(props.formData[key]),
          "onUpdate:modelValue": (val: string | number) => {
            updateFormData(key, val);
          },
        },
        fieldProps,
      };

    case "code":
      if (disabled) {
        return {
          component: UInput,
          componentProps: {
            ...componentPropsBase,
            type: "text",
            modelValue: ensureString(props.formData[key]),
            "onUpdate:modelValue": (val: string) => {
              updateFormData(key, val);
            },
          },
          fieldProps: {
            ...fieldProps,
            class: "col-span-2",
          },
        };
      }

      return {
        component: resolveComponent("FormCodeEditorLazy"),
        componentProps: {
          ...componentPropsBase,
          modelValue: ensureString(props.formData[key]),
          language: config.language || "javascript",
          height: config.height || "300px",
          "onUpdate:modelValue": (val: string) => {
            updateFormData(key, val);
          },
          onDiagnostics: (diags: any[]) => {
            const updated = { ...props.errors };
            if (diags?.length > 0) {
              const errorMessages = diags
                .filter((d: any) => d.severity === 'error')
                .map((d: any) => d.message)
                .join('; ');
              updated[key] = errorMessages || "Code syntax error";
            } else {
              delete updated[key];
            }
            updateErrors(updated);
          },
          ...(hasError && { error: props.errors[key] }),
        },
        fieldProps: {
          ...fieldProps,
          class: "col-span-2",
        },
      };

    case "array-tags":
      return {
        component: resolveComponent("FormArraySelectDisplay"),
        componentProps: {
          ...componentPropsBase,
          modelValue: ensureString(props.formData[key]),
          "onUpdate:modelValue": (val: string) => {
            updateFormData(key, val);
          },
          ...(hasError && { error: props.errors[key] }),
        },
        fieldProps,
      };

    case "richtext":
      // If field is disabled, show disabled input instead of rich text editor
      if (disabled) {
        return {
          component: UInput,
          componentProps: {
            ...componentPropsBase,
            type: "text",
            class: "w-full bg-gray-100",
            modelValue: ensureString(props.formData[key]),
            "onUpdate:modelValue": (val: string) => {
              updateFormData(key, val);
            },
          },
          fieldProps: {
            ...fieldProps,
            class: "col-span-2",
          },
        };
      }

      return {
        component: resolveComponent("FormRichTextEditorLazy"),
        componentProps: {
          modelValue: ensureString(props.formData[key]),
          disabled: disabled,
          "onUpdate:modelValue": (val: string) => {
            updateFormData(key, val);
          },
          ...(hasError && { error: props.errors[key] }),
        },
        fieldProps: {
          ...fieldProps,
          class: "col-span-2",
        },
      };

    case "uuid":
      return {
        component: resolveComponent("FormUuidField"),
        componentProps: {
          modelValue: ensureString(props.formData[key]),
          disabled: disabled,
          isPrimary: column?.isPrimary || false,
          "onUpdate:modelValue": (val: string) => {
            updateFormData(key, val);
          },
          ...(hasError && { error: props.errors[key] }),
        },
        fieldProps,
      };

    case "permission":
      return {
        component: resolveComponent("FormPermissionInlineEditor"),
        componentProps: {
          modelValue: props.formData[key],
          disabled: disabled,
          "onUpdate:modelValue": (val: any) => {
            updateFormData(key, val);
          },
          ...(hasError && { error: props.errors[key] }),
        },
        fieldProps,
      };

    case "date": {
      return {
        component: FormDateField,
        componentProps: {
          disabled: disabled,
          modelValue: props.formData[key],
          "onUpdate:modelValue": (val: Date | null) => {
            updateFormData(key, val);
          },
          ...(hasError && { error: props.errors[key] }),
        },
        fieldProps,
      };
    }

    case "int":
      return {
        component: UInput,
        componentProps: {
          ...componentPropsBase,
          type: "number",
          modelValue: ensureString(props.formData[key]),
          "onUpdate:modelValue": (val: string) => {
            updateFormData(key, val);
          },
        },
        fieldProps,
      };

    default:
      return {
        component: UInput,
        componentProps: {
          ...componentPropsBase,
          type: "text",
          modelValue: ensureString(props.formData[key]),
          "onUpdate:modelValue": (val: string) => {
            updateFormData(key, val);
          },
        },
        fieldProps,
      };
  }
}

const componentConfig = computed(() => getComponentConfigByKey(props.keyName));
const errorMessage = computed(() => props.errors?.[props.keyName]);
const hasError = computed(() => !!errorMessage.value);

const isCustomComponent = computed(() => {
  const column = props.columnMap.get(props.keyName);
  const manualConfig = props.typeMap?.[props.keyName];
  const config =
    typeof manualConfig === "string"
      ? { type: manualConfig }
      : manualConfig || {};
  const finalType = config.type || column?.type;
  const isRelation = column?.fieldType === "relation";
  
  const customTypes = [
    'richtext',
    'code',
    'simple-json',
    'uuid',
    'permission',
    'date',
    'array-tags',
  ];
  
  return isRelation || (finalType && customTypes.includes(finalType));
});

// Get component type for loading skeleton
function getComponentType(): string {
  const column = props.columnMap.get(props.keyName);
  const manualConfig = props.typeMap?.[props.keyName];
  const config =
    typeof manualConfig === "string"
      ? { type: manualConfig }
      : manualConfig || {};
  return config.type || column?.type || "text";
}

</script>

<template>
  <div>
    <!-- Loading skeleton với fadeout -->
    <div v-if="props.loading">
      <FieldLoadingSkeleton :type="getComponentType()" />
    </div>

    <!-- Component chính -->
    <div v-else class="field-input">
      <UFormField :error="errorMessage">
        <div
          v-if="isCustomComponent && hasError"
          class="rounded-md border-2 border-red-500"
        >
      <component
        :is="componentConfig.component"
        v-bind="componentConfig.componentProps"
      />
        </div>
        <component
          v-else
          :is="componentConfig.component"
          v-bind="componentConfig.componentProps"
        />
      </UFormField>
    </div>
  </div>
</template>

<style>
.field-input {
  opacity: 0;
  animation: fadeIn 0.5s ease forwards;
}

@keyframes fadeIn {
  0% {
    opacity: 0;
    transform: translateY(5px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
