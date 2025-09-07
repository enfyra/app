<template>
  <UInput
    v-model="displayValue"
    :placeholder="placeholder"
    class="min-w-32 min-h-8"
    @blur="normalizeInput"
  />
</template>

<script setup lang="ts">
import { parseArrayValue, getArrayPlaceholder } from '~/utils/common/filter/filter-helpers';

const props = defineProps<{
  modelValue: any[];
  fieldType: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: any[]];
}>();

const displayValue = computed({
  get: () => {
    if (Array.isArray(props.modelValue)) {
      return props.modelValue.join(',');
    }
    return '';
  },
  set: (value: string) => {
    handleArrayInput(value);
  }
});

const placeholder = computed(() => {
  return getArrayPlaceholder(props.fieldType);
});

function handleArrayInput(value: string) {
  const parsedValues = parseArrayValue(value, props.fieldType);
  emit('update:modelValue', parsedValues);
}

// Auto-normalize input format on blur
function normalizeInput() {
  // This will trigger the computed displayValue to re-render with proper format
  // The computed getter will join the array with ',' (no spaces)
  if (Array.isArray(props.modelValue) && props.modelValue.length > 0) {
    // Force re-render to show normalized format
    nextTick();
  }
}
</script>