import type { FilterCondition, FilterGroup } from '~/utils/common/filter/filter-types';

interface DragState {
  sourceGroup: FilterGroup;
  sourceIndex: number;
  item: FilterCondition | FilterGroup | null;
}

interface DropTargetState {
  group: FilterGroup;
  index: number;
  position: 'before' | 'after';
}

interface DropResult {
  success: boolean;
  sourceGroupId: string | null;
  targetGroupId: string | null;
}

const dragState = ref<DragState | null>(null);
const dropTarget = ref<DropTargetState | null>(null);
const isEndZone = ref(false);
const modifiedGroupIds = ref<string[]>([]);
const modificationVersion = ref(0);

export function useFilterDragDrop() {
  function startDrag(sourceGroup: FilterGroup, sourceIndex: number) {
    const item = sourceGroup.conditions[sourceIndex];
    if (!item) return;

    dragState.value = {
      sourceGroup,
      sourceIndex,
      item,
    };
  }

  function setDropTarget(group: FilterGroup, index: number, position: 'before' | 'after') {
    dropTarget.value = { group, index, position };
    isEndZone.value = false;
  }

  function setEndZoneDropTarget(group: FilterGroup) {
    dropTarget.value = { group, index: group.conditions.length, position: 'after' };
    isEndZone.value = true;
  }

  function clearDropTarget() {
    dropTarget.value = null;
    isEndZone.value = false;
  }

  function canDrop(targetGroup: FilterGroup, targetIndex: number): boolean {
    if (!dragState.value) return false;
    if (dragState.value.sourceGroup === targetGroup && dragState.value.sourceIndex === targetIndex) {
      return false;
    }
    return true;
  }

  function executeDrop(targetGroup: FilterGroup): DropResult {
    const defaultResult: DropResult = { success: false, sourceGroupId: null, targetGroupId: null };

    if (!dragState.value || !dropTarget.value) return defaultResult;

    const { sourceGroup, sourceIndex, item } = dragState.value;
    if (!item) return defaultResult;

    const { group: targetGroupActual, index: targetIndex, position } = dropTarget.value;

    if (sourceGroup === targetGroupActual) {
      const newConditions = [...sourceGroup.conditions];
      const [movedItem] = newConditions.splice(sourceIndex, 1);

      if (!movedItem) {
        endDrag();
        return defaultResult;
      }

      let insertIndex = targetIndex;
      if (sourceIndex < targetIndex) {
        insertIndex = position === 'before' ? targetIndex - 1 : targetIndex;
      } else {
        insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
      }

      insertIndex = Math.max(0, Math.min(insertIndex, newConditions.length));
      newConditions.splice(insertIndex, 0, movedItem);
      sourceGroup.conditions = newConditions;
      endDrag();
      return { success: true, sourceGroupId: sourceGroup.id, targetGroupId: targetGroupActual.id };
    } else {
      const movedItem = sourceGroup.conditions[sourceIndex];
      if (!movedItem) {
        endDrag();
        return defaultResult;
      }

      let insertIndex = targetIndex;
      if (position === 'after') {
        insertIndex = targetIndex;
      } else {
        insertIndex = Math.max(0, targetIndex);
      }

      insertIndex = Math.max(0, Math.min(insertIndex, targetGroupActual.conditions.length));

      const newSourceConditions = [...sourceGroup.conditions];
      newSourceConditions.splice(sourceIndex, 1);

      const newTargetConditions = [...targetGroupActual.conditions];
      newTargetConditions.splice(insertIndex, 0, movedItem);

      sourceGroup.conditions = newSourceConditions;
      targetGroupActual.conditions = newTargetConditions;

      modifiedGroupIds.value = [sourceGroup.id, targetGroupActual.id];
      modificationVersion.value++;

      endDrag();
      return { success: true, sourceGroupId: sourceGroup.id, targetGroupId: targetGroupActual.id };
    }
  }

  function endDrag() {
    dragState.value = null;
    dropTarget.value = null;
    isEndZone.value = false;
  }

  function wasGroupModified(groupId: string): boolean {
    return modifiedGroupIds.value.includes(groupId);
  }

  function clearGroupModified(groupId: string) {
    modifiedGroupIds.value = modifiedGroupIds.value.filter(id => id !== groupId);
  }

  function markGroupModified(groupId: string) {
    if (!modifiedGroupIds.value.includes(groupId)) {
      modifiedGroupIds.value.push(groupId);
      modificationVersion.value++;
    }
  }

  function isDragging(): boolean {
    return dragState.value !== null;
  }

  function isDraggingItem(sourceGroup: FilterGroup, sourceIndex: number): boolean {
    if (!dragState.value) return false;
    return dragState.value.sourceGroup === sourceGroup && dragState.value.sourceIndex === sourceIndex;
  }

  function getDropIndicator(group: FilterGroup, index: number): 'before' | 'after' | null {
    if (!dropTarget.value || isEndZone.value) return null;
    if (dropTarget.value.group !== group || dropTarget.value.index !== index) return null;
    return dropTarget.value.position;
  }

  function isEndZoneActive(group: FilterGroup): boolean {
    if (!dropTarget.value || !isEndZone.value) return false;
    return dropTarget.value.group === group;
  }

  return {
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
    markGroupModified,
    modificationVersion,
  };
}