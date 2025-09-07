<script setup lang="ts">
const props = defineProps<{
  condition: FilterCondition;
  parentGroup: FilterGroup;
  conditionIndex: number;
  schemas: Record<string, any>;
  tableName: string;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  "update:condition": [condition: FilterCondition];
  "convert-to-group": [group: FilterGroup, index: number];
  remove: [index: number];
}>();

function updateCondition() {
  emit("update:condition", { ...props.condition });
}

function updateValue(newValue: any) {
  props.condition.value = newValue;
  updateCondition();
}

function onFieldSelectChange(selectedValue: string) {
  const { onFieldSelectChange: handleFieldSelect } = useFieldSelection(
    props.schemas,
    props.tableName
  );

  const result = handleFieldSelect(
    selectedValue,
    props.condition,
    props.parentGroup!,
    emit
  );

  if (result && result.convertToGroup && result.newGroup) {
    emit("convert-to-group", result.newGroup, props.conditionIndex);
  }
}

// Get enum options for select fields
const enumOptions = computed(() => {
  if (props.condition.type === "select") {
    return getFieldOptions(
      props.condition.field,
      props.tableName,
      props.schemas
    );
  }
  return [];
});
</script>

<template>
  <div
    class="flex items-center gap-2 p-3 border border-muted rounded-lg bg-gray-800/50"
  >
    <!-- Field Select -->
    <div v-if="!readonly" class="flex items-center gap-2">
      <USelect
        :model-value="
          condition.field.includes('.')
            ? condition.field.split('.').pop()
            : condition.field
        "
        :items="getCombinedOptionsForContext(tableName, schemas)"
        @update:model-value="(val) => onFieldSelectChange(val as string)"
        :placeholder="
          parentGroup.relationContext
            ? 'Select field from ' + parentGroup.relationContext
            : 'Select field or relation'
        "
        class="min-w-40 min-h-8"
      />
    </div>
    <span v-else class="text-sm font-medium min-w-32">{{
      condition.field
    }}</span>

    <!-- Operator Select -->
    <USelect
      v-if="!readonly"
      v-model="condition.operator"
      :items="getOperatorsByType(condition.type || 'string')"
      @update:model-value="updateCondition"
      class="min-w-32 min-h-8"
    />
    <span v-else class="text-sm min-w-32">
      {{
        getOperatorsByType(condition.type || "string").find(
          (op) => op.value === condition.operator
        )?.label
      }}
    </span>

    <!-- Value Input -->
    <template
      v-if="needsValue(condition.operator) || condition.operator === '_is_null'"
    >
      <FilterValueInput
        v-if="!readonly"
        :model-value="condition.value"
        @update:model-value="updateValue"
        :operator="condition.operator"
        :field-type="condition.type || 'string'"
        :enum-options="enumOptions"
      />

      <!-- Readonly Value Display -->
      <span v-else class="text-sm">
        <template v-if="condition.operator === '_is_null'">
          {{ condition.value ? "Is empty" : "Is not empty" }}
        </template>
        <template v-else-if="needsTwoValues(condition.operator)">
          {{ condition.value?.[0] }} - {{ condition.value?.[1] }}
        </template>
        <template v-else-if="Array.isArray(condition.value)">
          {{ condition.value.join(", ") }}
        </template>
        <template v-else>
          {{ condition.value }}
        </template>
      </span>
    </template>

    <!-- Remove Button -->
    <UButton
      v-if="!readonly"
      @click="emit('remove', conditionIndex)"
      icon="lucide:x"
      size="xs"
      color="error"
      variant="ghost"
    />
  </div>
</template>
