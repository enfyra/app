<script setup lang="ts">
// Types will be auto-imported from utils

const props = defineProps<{
  group: FilterGroup;
  schemas: Record<string, any>;
  tableName: string;
  rootTableName?: string;
  readonly?: boolean;
}>();
const emit = defineEmits<{
  "update:group": [group: FilterGroup];
  remove: [];
}>();

function updateGroup() {
  emit("update:group", { ...props.group });
}

function addCondition() {
  // Get available fields for this context
  const availableOptions = getCombinedOptionsForContext(
    props.tableName,
    props.schemas
  );
  const firstField = availableOptions.find(
    (opt) => opt.fieldCategory === "column"
  );

  const newCondition: FilterCondition = {
    id: generateFilterId(),
    field: firstField?.value || "",
    operator: "_eq",
    value: null,
    type: firstField?.fieldType
      ? mapDbTypeToFilterType(firstField.fieldType)
      : "string",
  };
  props.group.conditions.push(newCondition);
  updateGroup();
}

function addGroup() {
  const newGroup: FilterGroup = {
    id: generateFilterId(),
    operator: "and",
    conditions: [],
  };
  props.group.conditions.push(newGroup);
  updateGroup();
}

function removeItem(index: number) {
  props.group.conditions.splice(index, 1);
  updateGroup();
}

function onConditionUpdate(condition: FilterCondition, index: number) {
  props.group.conditions[index] = condition;
  updateGroup();
}

function onConvertToGroup(newGroup: FilterGroup, index: number) {
  props.group.conditions[index] = newGroup;
  updateGroup();
}

function onNestedGroupUpdate(group: FilterGroup, index: number) {
  props.group.conditions[index] = group;
  updateGroup();
}

function isCondition(
  item: FilterCondition | FilterGroup
): item is FilterCondition {
  return "field" in item;
}

const { isMobile, isTablet } = useScreen();
</script>

<template>
  <div class="space-y-4">
    <!-- Group Operator -->
    <div class="flex items-center gap-2" v-if="group.conditions.length > 1">
      <USelect
        v-if="!readonly"
        v-model="group.operator"
        :items="[
          { label: 'AND', value: 'and' },
          { label: 'OR', value: 'or' },
        ]"
        @update:model-value="updateGroup"
        size="xs"
        class="w-20"
      />
      <span v-else class="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
        {{ group.operator.toUpperCase() }}
      </span>
    </div>

    <div :class="(isMobile || isTablet) ? 'space-y-2 pl-2 border-l-2 border-gray-200 dark:border-gray-700' : 'space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700'">
      <template v-for="(item, index) in group.conditions" :key="item.id">
        <!-- Filter Condition -->
        <FilterCondition
          v-if="isCondition(item)"
          :condition="item"
          :parent-group="group"
          :condition-index="index"
          :schemas="schemas"
          :table-name="tableName"
          :readonly="!!readonly"
          @update:condition="(condition) => onConditionUpdate(condition, index)"
          @convert-to-group="(newGroup, idx) => onConvertToGroup(newGroup, idx)"
          @remove="removeItem"
        />

        <!-- Nested Filter Group -->
        <div v-else :class="(isMobile || isTablet) ? 'border border-gray-200 dark:border-gray-700 rounded-lg p-2' : 'border border-gray-200 dark:border-gray-700 rounded-lg p-3'">
          <!-- Show relation context if this is a relation group -->
          <div
            v-if="item.relationContext"
            class="mb-3 p-2 bg-blue-50 dark:bg-blue-950 rounded text-sm text-blue-700 dark:text-blue-300"
          >
            <span class="font-medium">Filtering in relation:</span>
            {{ item.relationContext }}
            <span class="text-gray-500 dark:text-gray-400"
              >({{
                getTargetTableNameForGroup(
                  item,
                  schemas,
                  rootTableName || tableName
                )
              }})</span
            >
          </div>

          <FilterGroup
            :group="item"
            :schemas="schemas"
            :table-name="
              getTargetTableNameForGroup(
                item,
                schemas,
                rootTableName || tableName
              )
            "
            :root-table-name="rootTableName || tableName"
            :readonly="!!readonly"
            @update:group="(g) => onNestedGroupUpdate(g, index)"
            @remove="() => removeItem(index)"
          />

          <UButton
            v-if="!readonly"
            @click="removeItem(index)"
            icon="lucide:x"
            size="xs"
            color="error"
            variant="ghost"
            class="mt-2"
          >
            Remove Group
          </UButton>
        </div>
      </template>

      <!-- Add Actions -->
      <div v-if="!readonly" class="flex gap-2">
        <UButton
          @click="addCondition"
          icon="lucide:plus"
          size="xs"
          variant="soft"
        >
          Add Filter
        </UButton>
        <UButton
          @click="addGroup"
          icon="lucide:layers"
          size="xs"
          variant="soft"
        >
          Add Group
        </UButton>
      </div>
    </div>
  </div>
</template>
