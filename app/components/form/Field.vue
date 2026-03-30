<script setup lang="ts">
import type { UniqueCheckStatus } from '~/types/ui';

const props = withDefaults(
  defineProps<{
  keyName: string;
  formData: Record<string, any>;
  columnMap: Map<string, any>;
  fieldMap?: Record<string, any>;
  errors: Record<string, string>;
  loading?: boolean;
    mode?: 'create' | 'update';
    isUniqueField?: boolean;
    uniqueCheckStatus?: UniqueCheckStatus;
    uniqueCheckMessage?: string;
  }>(),
  {
    mode: 'update',
    isUniqueField: false,
    uniqueCheckStatus: 'idle',
    uniqueCheckMessage: '',
  }
);

const emit = defineEmits<{
  "update:formData": [key: string, value: any];
  "update:errors": [errors: Record<string, string>];
  "checkUnique": [fieldName: string];
}>();

const uniqueId = useId();
const fieldId = computed(() => `field-${props.keyName}-${uniqueId}`);
const scrollId = computed(() => `scroll-${fieldId.value}`);

const copyStatus = ref<"idle" | "success" | "error">("idle");

function updateFormData(key: string, value: any) {
  emit("update:formData", key, value);
}

function updateErrors(errors: Record<string, string>) {
  emit("update:errors", errors);
}

function handleCheckUnique() {
  emit("checkUnique", props.keyName);
}

const column = computed(() => props.columnMap.get(props.keyName));
const displayLabel = computed(() => {
  if (fieldConfig.value.hideLabel) return '';
  return (fieldConfig.value.label || column.value?.label || props.keyName) as string;
});

const displayDescription = computed(() => {
  if (fieldConfig.value.hideDescription) return null;
  return fieldConfig.value.description || column.value?.description || null;
});

const fieldConfig = computed(() => {
  const manualConfig = props.fieldMap?.[props.keyName];
  const config =
    typeof manualConfig === "string"
      ? { type: manualConfig }
      : manualConfig || {};
  return config;
});

const fieldProps = computed(() => {
  return fieldConfig.value.fieldProps || {};
});

const fieldPermission = computed(() => {
  return fieldConfig.value.permission;
});

const isRelationField = computed(() => {
  const field = props.columnMap.get(props.keyName);
  return field?.fieldType === "relation";
});

const isRequiredField = computed(() => {
  const field = props.columnMap.get(props.keyName);
  if (!field) return false;
  if (field?.isNullable === false && field?.isGenerated !== true && (props.mode === 'create' || field?.isHidden !== true)) {
    if (field?.type === 'boolean') return false;
    if (props.keyName === 'createdAt' || props.keyName === 'updatedAt') return false;
    return true;
  }
  return false;
});

const isEmptyValue = computed(() => {
  const v = props.formData[props.keyName];
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
});

async function copyRawValue() {
  const rawValue = props.formData[props.keyName];

  let textToCopy: string;
  if (typeof rawValue === "string") {
    textToCopy = rawValue; 
  } else if (rawValue === null || rawValue === undefined) {
    textToCopy = String(rawValue);
  } else {
    textToCopy = JSON.stringify(rawValue, null, 2);
  }

  try {
    
    if (!navigator.clipboard || !window.isSecureContext) {
      throw new Error("Clipboard API not available or not in secure context");
    }

    await navigator.clipboard.writeText(textToCopy);
    copyStatus.value = "success";

    setTimeout(() => {
      copyStatus.value = "idle";
    }, 2000);
  } catch (error) {
    
    try {
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      textArea.style.opacity = "0";
      textArea.style.pointerEvents = "none";
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, textArea.value.length);

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        copyStatus.value = "success";
      } else {
        copyStatus.value = "error";
      }
    } catch (fallbackError) {
      copyStatus.value = "error";
    }

    setTimeout(() => {
      copyStatus.value = "idle";
    }, 2000);
  }
}

const dropdownItems = computed(() => [
  {
    label: "Copy Raw Value",
    icon: "i-lucide-copy",
    onSelect: copyRawValue,
  },
]);

const isBooleanField = computed(() => {
  const field = props.columnMap.get(props.keyName);
  const configType = typeof fieldConfig.value === "string" ? fieldConfig.value : fieldConfig.value?.type;

  return field?.type === "boolean" || configType === "boolean";
});

const { isMobile, isTablet } = useScreen();

const effectiveErrors = computed(() => {
  if (props.uniqueCheckStatus === 'invalid') {
    return { ...props.errors, [props.keyName]: props.uniqueCheckMessage || 'Value already exists' };
  }
  return props.errors;
});
</script>

<template>
  <PermissionGate :condition="fieldPermission">
  <div :id="scrollId"></div>
  <div
    v-if="isBooleanField"
    v-bind="fieldProps"
    :class="(isMobile || isTablet) ? 'flex items-center justify-between py-4 border-t' : 'flex items-center justify-between py-4 border-t border-b'"
    :style="{
      borderColor: 'var(--border-subtle)',
    }"
  >
    <div v-if="!fieldConfig.hideLabel" class="space-y-0.5">
      <label
        :for="fieldId"
        class="text-sm font-medium"
        :style="{ color: 'var(--text-primary)' }"
      >
        {{ displayLabel }}
      </label>
      <p
        v-if="displayDescription"
        class="text-xs"
        :style="{ color: 'var(--text-tertiary)' }"
        v-html="displayDescription"
      />
    </div>

    <FormFieldRenderer
      :key-name="keyName"
      :form-data="formData"
      :column-map="columnMap"
        :field-map="fieldMap"
      :errors="effectiveErrors"
      :field-id="fieldId"
      @update:form-data="updateFormData"
      @update:errors="updateErrors"
      :loading="props.loading"
    />
  </div>

  <div v-else v-bind="fieldProps" class="space-y-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1">
        <label
          :for="fieldId"
          class="text-sm font-medium flex items-center gap-1"
          :style="{ color: 'var(--text-primary)' }"
        >
          {{ displayLabel }}
          <span
            v-if="
              column?.isNullable === false &&
              column?.isGenerated !== true &&
              (props.mode === 'create' || column?.isHidden !== true) &&
              column?.type !== 'boolean' &&
              keyName !== 'createdAt' &&
              keyName !== 'updatedAt'
            "
            class="text-red-500"
            >*</span
          >
        </label>

        <div v-if="!isRelationField" class="flex items-center gap-1 opacity-0 lg:group-hover:opacity-100 transition-opacity">
          <Transition name="fade">
            <UIcon
              v-if="copyStatus === 'success'"
              name="i-lucide-check"
              class="w-3.5 h-3.5 text-green-600"
            />
            <UIcon
              v-else-if="copyStatus === 'error'"
              name="i-lucide-x"
              class="w-3.5 h-3.5 text-red-600"
            />
          </Transition>
          <UDropdownMenu :items="dropdownItems">
            <UButton
              icon="i-lucide-chevron-down"
              size="xs"
              variant="ghost"
              color="neutral"
              @click.stop
            />
          </UDropdownMenu>
        </div>
      </div>

      <div v-if="isUniqueField" class="flex items-center gap-1">
        <UIcon
          v-if="uniqueCheckStatus === 'checking'"
          name="i-lucide-loader-2"
          class="w-3.5 h-3.5 animate-spin text-blue-500"
        />
        <UTooltip v-else-if="uniqueCheckStatus === 'valid'" text="Value is unique">
          <UBadge color="success" variant="subtle" size="xs">
            <UIcon name="i-lucide-check" class="w-3 h-3 mr-0.5" />
            Unique
          </UBadge>
        </UTooltip>
        <UTooltip v-else-if="uniqueCheckStatus === 'invalid'" :text="uniqueCheckMessage || 'Value already exists'">
          <UBadge color="error" variant="subtle" size="xs">
            <UIcon name="i-lucide-x" class="w-3 h-3 mr-0.5" />
            Duplicate
          </UBadge>
        </UTooltip>
        <UTooltip v-else-if="uniqueCheckStatus === 'incomplete'" :text="uniqueCheckMessage || 'Fill all related fields first'">
          <UBadge color="warning" variant="subtle" size="xs">
            <UIcon name="i-lucide-alert-circle" class="w-3 h-3 mr-0.5" />
            Incomplete
          </UBadge>
        </UTooltip>
        <UButton
          v-else
          type="button"
          icon="i-lucide-search-check"
          label="Check"
          size="xs"
          variant="outline"
          color="primary"
          :disabled="isRequiredField && isEmptyValue"
          @click.stop="handleCheckUnique"
        />
      </div>
    </div>

    <FormFieldRenderer
      :key-name="keyName"
      :form-data="formData"
      :column-map="columnMap"
        :field-map="fieldMap"
      :errors="effectiveErrors"
      :field-id="fieldId"
      @update:form-data="updateFormData"
      @update:errors="updateErrors"
      :loading="props.loading"
    />

    <p
      v-if="uniqueCheckStatus === 'incomplete' && uniqueCheckMessage"
      class="text-xs text-amber-500"
    >
      {{ uniqueCheckMessage }}
    </p>
    <p
      v-else-if="!effectiveErrors?.[keyName] && column?.description"
      class="text-xs"
      :style="{ color: 'var(--text-tertiary)' }"
      v-html="displayDescription"
    />
  </div>
  </PermissionGate>
</template>
