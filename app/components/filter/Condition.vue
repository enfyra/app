<script setup lang="ts">
import { createFieldSelectionHandler } from '~/utils/common/filter/field-selection';

const props = defineProps<{
  condition: FilterCondition;
  parentGroup: FilterGroup;
  conditionIndex: number;
  schemas: Record<string, any>;
  tableName: string;
  readonly?: boolean;
  allowedFields?: string[];
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
  const handleFieldSelect = createFieldSelectionHandler(props.schemas, props.tableName);
  const result = handleFieldSelect(selectedValue, props.condition, props.parentGroup!, emit);

  if (result && result.convertToGroup && result.newGroup) {
    emit("convert-to-group", result.newGroup, props.conditionIndex);
  }
}

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

const fieldOptions = computed(() => {
  const options = getCombinedOptionsForContext(props.tableName, props.schemas);
  if (!props.allowedFields?.length) return options;
  return options.filter((option) => props.allowedFields!.includes(option.value));
});

const { isMobile, isTablet } = useScreen();
</script>

<template>
  <div
    :class="[
      'filter-condition-card surface-card rounded-lg min-w-0',
      (isMobile || isTablet) ? 'p-2' : 'p-3'
    ]"
  >
    <div :class="(isMobile || isTablet) ? 'space-y-2' : 'filter-condition-layout'">
      <div v-if="!readonly" class="filter-condition-field min-w-0">
        <label v-if="isMobile || isTablet" class="text-xs text-[var(--text-tertiary)] mb-1 block">Field</label>
        <USelect
          :model-value="
            condition.field.includes('.')
              ? condition.field.split('.').pop()
              : condition.field
          "
          :items="fieldOptions"
          @update:model-value="(val) => onFieldSelectChange(val as string)"
          :placeholder="
            parentGroup.relationContext
              ? 'Select field from ' + parentGroup.relationContext
              : 'Select field or relation'
          "
          class="w-full min-w-0 min-h-8"
          :size="(isMobile || isTablet) ? 'sm' : 'md'"
        />
      </div>
      <span v-else class="filter-condition-field min-w-0 truncate text-sm font-medium">{{
        condition.field
      }}</span>

      <div class="filter-condition-operator min-w-0">
        <label v-if="(isMobile || isTablet) && !readonly" class="text-xs text-[var(--text-tertiary)] mb-1 block">Operator</label>
        <USelect
          v-if="!readonly"
          v-model="condition.operator"
          :items="getOperatorsByType(condition.type || 'string')"
          @update:model-value="updateCondition"
          class="w-full min-w-0 min-h-8"
          :size="(isMobile || isTablet) ? 'sm' : 'md'"
        />
        <span v-else class="block min-w-0 truncate text-sm">
          {{
            getOperatorsByType(condition.type || "string").find(
              (op) => op.value === condition.operator
            )?.label
          }}
        </span>
      </div>

      <div
        v-if="needsValue(condition.operator) || condition.operator === '_is_null'"
        class="filter-condition-value min-w-0"
      >
          <label v-if="(isMobile || isTablet) && !readonly" class="text-xs text-[var(--text-tertiary)] mb-1 block">Value</label>
          <FilterValueInput
            v-if="!readonly"
            :model-value="condition.value"
            @update:model-value="updateValue"
            :operator="condition.operator"
            :field-type="condition.type || 'string'"
            :enum-options="enumOptions"
          />

          <span v-else class="block min-w-0 truncate text-sm">
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
      </div>

      <UButton
        v-if="!readonly"
        @click="emit('remove', conditionIndex)"
        icon="lucide:x"
        size="xs"
        color="error"
        variant="ghost"
        :class="(isMobile || isTablet) ? 'w-full' : 'filter-condition-remove justify-self-end'"
      >
        <span v-if="isMobile || isTablet">Remove</span>
      </UButton>
    </div>
  </div>
</template>

<style scoped>
.filter-condition-card {
  container-type: inline-size;
}

.filter-condition-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(7rem, 0.8fr) minmax(7rem, 1fr) auto;
  align-items: center;
  gap: 0.5rem;
}

@container (max-width: 28rem) {
  .filter-condition-layout {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  }

  .filter-condition-field {
    grid-column: 1 / -1;
  }

  .filter-condition-value {
    grid-column: 2;
  }

  .filter-condition-remove {
    grid-column: 3;
    grid-row: 2;
  }
}

@container (max-width: 20rem) {
  .filter-condition-layout {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .filter-condition-field,
  .filter-condition-operator,
  .filter-condition-value {
    grid-column: 1 / -1;
  }

  .filter-condition-remove {
    grid-column: 2;
    grid-row: auto;
  }
}
</style>
