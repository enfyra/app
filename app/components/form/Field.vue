<script setup lang="ts">
// Vue functions are auto-imported

const props = defineProps<{
  keyName: string;
  formData: Record<string, any>;
  columnMap: Map<string, any>;
  typeMap?: Record<string, any>;
  errors: Record<string, string>;
  loading?: boolean;
}>();

const emit = defineEmits<{
  "update:formData": [key: string, value: any];
  "update:errors": [errors: Record<string, string>];
}>();

// Copy status state
const copyStatus = ref<"idle" | "success" | "error">("idle");

function updateFormData(key: string, value: any) {
  emit("update:formData", key, value);
}

function updateErrors(errors: Record<string, string>) {
  emit("update:errors", errors);
}

const column = computed(() => props.columnMap.get(props.keyName));

const fieldProps = computed(() => {
  const manualConfig = props.typeMap?.[props.keyName];
  const config =
    typeof manualConfig === "string"
      ? { type: manualConfig }
      : manualConfig || {};

  // Get field type from schema
  const field = props.columnMap.get(props.keyName);
  const fieldType = config.type || field?.type;

  // Add col-span-2 for specific field types
  const baseProps = config.fieldProps || {};
  if (["richtext", "code", "simple-json", "text"].includes(fieldType)) {
    return {
      ...baseProps,
      class: `${baseProps.class || ""} col-span-2`.trim(),
    };
  }

  return baseProps;
});

// Check if field is a relation (exclude from dropdown)
const isRelationField = computed(() => {
  const field = props.columnMap.get(props.keyName);
  return field?.fieldType === "relation";
});

// Copy raw value function
async function copyRawValue() {
  const rawValue = props.formData[props.keyName];

  // Handle different value types for copy
  let textToCopy: string;
  if (typeof rawValue === "string") {
    textToCopy = rawValue; // Don't stringify strings to avoid quotes
  } else if (rawValue === null || rawValue === undefined) {
    textToCopy = String(rawValue);
  } else {
    textToCopy = JSON.stringify(rawValue, null, 2);
  }

  try {
    // Check if clipboard API is available and in secure context
    if (!navigator.clipboard || !window.isSecureContext) {
      throw new Error("Clipboard API not available or not in secure context");
    }

    await navigator.clipboard.writeText(textToCopy);
    copyStatus.value = "success";

    // Reset status after 2 seconds
    setTimeout(() => {
      copyStatus.value = "idle";
    }, 2000);
  } catch (error) {
    // Fallback: try using execCommand
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

    // Reset status after 2 seconds
    setTimeout(() => {
      copyStatus.value = "idle";
    }, 2000);
  }
}

// Dropdown menu items
const dropdownItems = computed(() => [
  {
    label: "Copy Raw Value",
    icon: "i-lucide-copy",
    onSelect: copyRawValue,
  },
]);
</script>

<template>
  <UFormField
    v-bind="fieldProps"
    :label="keyName"
    class="rounded-lg border border-muted p-4"
    :error="errors?.[keyName]"
  >
    <template #label>
      <div class="flex items-center justify-between w-full">
        <span class="flex items-center gap-1">
          {{ keyName }}
          <span
            v-if="
              column?.isNullable === false &&
              column?.isGenerated !== true &&
              column?.type !== 'boolean' &&
              keyName !== 'createdAt' &&
              keyName !== 'updatedAt'
            "
            class="text-red-500"
            >*</span
          >
        </span>

        <div class="flex items-center gap-2">
          <!-- Copy Status Indicator -->
          <div class="flex items-center">
            <Transition name="fade">
              <UIcon
                v-if="copyStatus === 'success'"
                name="i-lucide-check"
                class="w-4 h-4 text-green-600 ml-2"
              />
              <UIcon
                v-else-if="copyStatus === 'error'"
                name="i-lucide-x"
                class="w-4 h-4 text-red-600"
              />
            </Transition>
          </div>

          <!-- Dropdown Menu for non-relation fields -->
          <UDropdownMenu
            v-if="!isRelationField"
            :items="dropdownItems"
            class="opacity-0 lg:group-hover:opacity-100 transition-opacity"
          >
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
    </template>

    <template #description v-if="column?.description">
      <div v-html="column?.description" />
    </template>

    <FormFieldRenderer
      :key-name="keyName"
      :form-data="formData"
      :column-map="columnMap"
      :type-map="typeMap"
      :errors="errors"
      @update:form-data="updateFormData"
      @update:errors="updateErrors"
      :loading="props.loading"
    />
  </UFormField>
</template>
