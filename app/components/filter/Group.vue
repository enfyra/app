<script setup lang="ts">

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

const dndRafId = ref<number | null>(null);
const endZoneEl = ref<HTMLElement | null>(null);

const {
  startDrag,
  setDropTarget,
  setEndZoneDropTarget,
  clearDropTarget,
  canDrop,
  executeDrop,
  endDrag,
  isDragging,
  isDraggingItem,
  getDropIndicator,
  isEndZoneActive,
  wasGroupModified,
  clearGroupModified,
  modificationVersion,
} = useFilterDragDrop();

watch(
  modificationVersion,
  () => {
    if (wasGroupModified(props.group.id)) {
      clearGroupModified(props.group.id);
      emit("update:group", { ...props.group });
    }
  }
);

function updateGroup() {
  emit("update:group", { ...props.group });
}

function addCondition() {
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
  const actualIndex = props.group.conditions.findIndex(c => c.id === group.id);
  const idx = actualIndex >= 0 ? actualIndex : index;
  props.group.conditions[idx] = group;
  updateGroup();
}

function isCondition(
  item: FilterCondition | FilterGroup
): item is FilterCondition {
  return "field" in item;
}

function onDragStart(index: number, event: DragEvent) {
  if (props.readonly) return;

  event.stopPropagation();

  if (dndRafId.value !== null && typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(dndRafId.value);
  }
  dndRafId.value = typeof requestAnimationFrame !== 'undefined'
    ? requestAnimationFrame(() => {
        dndRafId.value = null;
        startDrag(props.group, index);
      })
    : null;

  const item = props.group.conditions[index];
  if (item && event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }
}

function onItemDragOver(index: number, event: DragEvent) {
  if (props.readonly || !isDragging()) return;

  event.preventDefault();
  event.stopPropagation();

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }

  const isLast = index === props.group.conditions.length - 1;
  if (isLast) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    if (event.clientY >= rect.bottom - 10) {
      setEndZoneDropTarget(props.group);
      return;
    }
  }

  const position = index === 0 ? (() => {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    return event.clientY < midY ? 'before' : 'after';
  })() : 'after';
  if (!canDrop(props.group, index)) {
    clearDropTarget();
    return;
  }
  setDropTarget(props.group, index, position);
}

function onItemDragLeave(event: DragEvent) {
  event.stopPropagation();
  const current = event.currentTarget as HTMLElement | null;
  const related = (event as any).relatedTarget as Node | null;
  if (current && related && current.contains(related)) {
    return;
  }
  if (related && endZoneEl.value && endZoneEl.value.contains(related)) {
    return;
  }
  if (!related) {
    return;
  }
  clearDropTarget();
}

function onItemDrop(index: number, event: DragEvent) {
  if (props.readonly) return;

  event.preventDefault();
  event.stopPropagation();

  const isLast = index === props.group.conditions.length - 1;
  if (isLast) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    if (event.clientY >= rect.bottom - 10) {
      setEndZoneDropTarget(props.group);
      const result = executeDrop(props.group);
      if (result.success) {
        if (result.sourceGroupId === props.group.id || result.targetGroupId === props.group.id) {
          updateGroup();
        }
      } else {
        endDrag();
      }
      return;
    }
  }

  const position = index === 0 ? (() => {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    return event.clientY < midY ? 'before' : 'after';
  })() : 'after';
  if (!canDrop(props.group, index)) {
    clearDropTarget();
    endDrag();
    return;
  }
  setDropTarget(props.group, index, position);

  const result = executeDrop(props.group);

  if (result.success) {
    if (result.sourceGroupId === props.group.id || result.targetGroupId === props.group.id) {
      updateGroup();
    }
  } else {
    endDrag();
  }
}

function onDragEnd() {
  if (dndRafId.value !== null && typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(dndRafId.value);
    dndRafId.value = null;
  }
  endDrag();
}

function getDropClass(index: number): string {
  const indicator = getDropIndicator(props.group, index);
  if (!indicator) return '';

  if (indicator === 'before') return 'drop-indicator drop-indicator--before';
  return 'drop-indicator drop-indicator--after';
}

function isItemDragging(index: number): boolean {
  return isDraggingItem(props.group, index);
}

function onEndZoneDragOver(event: DragEvent) {
  if (props.readonly || !isDragging()) return;

  event.preventDefault();
  event.stopPropagation();

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }

  if (!isGroupEndZoneActive()) setEndZoneDropTarget(props.group);
}

function onEndZoneDragLeave(event: DragEvent) {
  event.stopPropagation();
}

function onEndZoneDrop(event: DragEvent) {
  if (props.readonly) return;

  event.preventDefault();
  event.stopPropagation();

  setEndZoneDropTarget(props.group);
  const result = executeDrop(props.group);

  if (result.success) {
    if (result.sourceGroupId === props.group.id || result.targetGroupId === props.group.id) {
      updateGroup();
    }
  } else {
    endDrag();
  }
}

function isGroupEndZoneActive(): boolean {
  return isEndZoneActive(props.group);
}

const { isMobile, isTablet } = useScreen();
</script>

<template>
  <div class="space-y-4">

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

    <div
      :class="[
        (isMobile || isTablet) ? 'space-y-2 pl-2 border-l-2 border-gray-200 dark:border-gray-700' : 'space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700',
        ''
      ]"
    >
      <template v-for="(item, index) in group.conditions" :key="item.id">
        <div
          :class="[
            'relative',
            isDragging() ? 'transition-none' : 'transition-all duration-150',
            getDropClass(index),
            isItemDragging(index) ? 'opacity-50 scale-[0.98]' : '',
          ]"
          @dragover="(e) => onItemDragOver(index, e)"
          @dragleave="onItemDragLeave"
          @drop="(e) => onItemDrop(index, e)"
        >
          <div class="flex items-start gap-1">
            <div
              v-if="!readonly"
              :draggable="true"
              class="flex-shrink-0 pt-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing"
              @dragstart="(e) => onDragStart(index, e)"
              @dragend="onDragEnd"
            >
              <UIcon name="lucide:grip-vertical" class="w-4 h-4" />
            </div>

            <div class="flex-1 min-w-0">
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

              <div v-else :class="(isMobile || isTablet) ? 'border border-gray-200 dark:border-gray-700 rounded-lg p-2' : 'border border-gray-200 dark:border-gray-700 rounded-lg p-3'">

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
            </div>
          </div>
        </div>
      </template>

      <div
        v-if="!readonly && isDragging()"
        ref="endZoneEl"
        :class="[
          'h-10 rounded-lg border-2 border-dashed transition-all duration-150',
          'mt-2 mb-2',
          isGroupEndZoneActive()
            ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/30'
            : 'border-gray-300 dark:border-gray-600'
        ]"
        @dragover="onEndZoneDragOver"
        @drop="onEndZoneDrop"
      >
        <div class="flex items-center justify-center h-10 text-xs text-gray-400 dark:text-gray-500 select-none">
          <UIcon name="lucide:plus" class="w-4 h-4 mr-1" />
          Drop here
        </div>
      </div>

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

<style scoped>
.drop-indicator::before {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  height: 10px;
  border-radius: 9999px;
  background: linear-gradient(90deg, rgba(139, 92, 246, 0) 0%, rgba(139, 92, 246, 0.98) 18%, rgba(139, 92, 246, 0.98) 82%, rgba(139, 92, 246, 0) 100%);
  box-shadow: 0 0 0 1px rgba(167, 139, 250, 0.4), 0 14px 28px rgba(139, 92, 246, 0.24);
  pointer-events: none;
}

.drop-indicator::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  background: rgba(139, 92, 246, 0.95);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.7), 0 10px 22px rgba(139, 92, 246, 0.22);
  pointer-events: none;
}

.drop-indicator--before::before {
  top: 6px;
}

.drop-indicator--after::before {
  bottom: 6px;
}

.drop-indicator--before::after {
  left: 6px;
  top: 6px;
}

.drop-indicator--after::after {
  left: 6px;
  bottom: 6px;
}

.drop-indicator {
  transition: padding 150ms ease;
  padding-top: 22px;
  padding-bottom: 22px;
}
</style>