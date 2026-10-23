<script setup lang="ts">
import type { FilterProps } from "../../utils/common/filter/filter-types";

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
    v-bind="{
      ...(rootTableName === undefined ? {} : { rootTableName }),
      ...(allowedFields === undefined ? {} : { allowedFields }),
    }"
    :readonly="!!readonly"
    @update:group="updateFilter"
  />
</template>
