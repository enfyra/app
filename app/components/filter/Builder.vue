<script setup lang="ts">
import type { FilterProps } from "../../utils/common/filter/filter-types";
// FilterGroup will be auto-imported by Nuxt

const props = defineProps<FilterProps>();

const emit = defineEmits<{
  "update:modelValue": [value: typeof props.modelValue];
}>();

function updateFilter(group: typeof props.modelValue) {
  emit("update:modelValue", group);
}
</script>

<template>
  <FilterGroup
    :group="modelValue"
    :schemas="schemas"
    :table-name="tableName"
    :root-table-name="rootTableName"
    :readonly="!!readonly"
    @update:group="updateFilter"
  />
</template>
