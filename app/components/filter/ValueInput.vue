<template>
  <!-- _is_null - Checkbox with label -->
  <div v-if="operator === '_is_null'" class="flex items-center gap-2 min-w-32">
    <UCheckbox 
      :model-value="modelValue" 
      @update:model-value="emit('update:modelValue', $event)"
    />
    <span class="text-sm text-gray-600">
      {{ modelValue ? 'Is empty' : 'Is not empty' }}
    </span>
  </div>

  <!-- Boolean Select -->
  <USelect
    v-else-if="fieldType === 'boolean'"
    :model-value="modelValue"
    :items="[
      { label: 'True', value: true },
      { label: 'False', value: false },
    ]"
    @update:model-value="emit('update:modelValue', $event)"
    class="min-w-32 min-h-8"
  />

  <!-- Date Picker - Single -->
  <FilterDatePicker
    v-else-if="fieldType === 'date' && !needsTwoValues(operator)"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    mode="single"
  />

  <!-- Date Picker - Range -->
  <FilterDatePicker
    v-else-if="fieldType === 'date' && needsTwoValues(operator)"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    mode="range"
  />

  <!-- Number Range -->
  <div
    v-else-if="fieldType === 'number' && needsTwoValues(operator)"
    class="flex items-center gap-1"
  >
    <UInput
      :model-value="modelValue?.[0] || ''"
      @update:model-value="handleRangeUpdate(0, $event)"
      type="number"
      class="w-24"
      placeholder="From"
    />
    <span class="text-xs text-gray-500">and</span>
    <UInput
      :model-value="modelValue?.[1] || ''"
      @update:model-value="handleRangeUpdate(1, $event)"
      type="number"
      class="w-24"
      placeholder="To"
    />
  </div>

  <!-- Multi-select for _in, _not_in with enums -->
  <USelect
    v-else-if="
      fieldType === 'select' &&
      ['_in', '_not_in'].includes(operator)
    "
    :model-value="modelValue"
    :items="enumOptions"
    multiple
    @update:model-value="emit('update:modelValue', $event)"
    class="min-w-32 min-h-8"
  />

  <!-- Single select for enums -->
  <USelect
    v-else-if="fieldType === 'select'"
    :model-value="modelValue"
    :items="enumOptions"
    @update:model-value="emit('update:modelValue', $event)"
    class="min-w-32 min-h-8"
  />

  <!-- Array input for _in, _not_in with other types -->
  <FilterArrayInput
    v-else-if="['_in', '_not_in'].includes(operator)"
    :model-value="modelValue"
    :field-type="fieldType"
    @update:model-value="emit('update:modelValue', $event)"
  />

  <!-- Default Single Input -->
  <UInput
    v-else
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :type="getInputType(fieldType)"
    class="min-w-32 min-h-8"
    :placeholder="getInputPlaceholder(operator, fieldType)"
  />
</template>

<script setup lang="ts">
import { needsTwoValues } from '~/utils/common/filter/filter-operators';
import { getInputType, getInputPlaceholder, updateRangeValue } from '~/utils/common/filter/filter-helpers';

const props = defineProps<{
  modelValue: any;
  operator: string;
  fieldType: string;
  enumOptions?: any[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

function handleRangeUpdate(index: 0 | 1, value: any) {
  const newValue = updateRangeValue(props.modelValue, index, value);
  emit('update:modelValue', newValue);
}
</script>