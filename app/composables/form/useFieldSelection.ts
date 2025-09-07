import type { FilterCondition, FilterGroup } from '~/utils/common/filter/filter-types';
import type { SchemaCollection } from '~/types/schema';
import { generateFilterId, mapDbTypeToFilterType, getOperatorsByType } from '~/utils/common/filter/filter-operators';
import { getCombinedOptionsForContext } from '~/utils/common/filter/filter-utils';

export function useFieldSelection(
  schemas: SchemaCollection,
  tableName: string
) {
  function onFieldSelectChange(
    selectedValue: string,
    condition: FilterCondition,
    parentGroup: FilterGroup,
    emit: Function
  ) {
    const options = getCombinedOptionsForContext(tableName, schemas);
    const selectedOption = options.find((opt) => opt.value === selectedValue);

    if (!selectedOption) return;

    if (selectedOption.fieldCategory === "column") {
      // Set field path - include relation prefix if in relation context
      const fieldPath = parentGroup.relationContext
        ? `${parentGroup.relationContext}.${selectedValue}`
        : selectedValue;

      condition.field = fieldPath;
      condition.type = mapDbTypeToFilterType(
        selectedOption.fieldType || "string"
      );
      condition.operator =
        getOperatorsByType(condition.type)[0]?.value || "_eq";
      condition.value = null;
      
      emit("update:condition", { ...condition });
    } else if (selectedOption.fieldCategory === "relation") {
      // Emit event to convert to group
      const newRelationContext = parentGroup.relationContext
        ? `${parentGroup.relationContext}.${selectedValue}`
        : selectedValue;

      // Get target table name and its first field
      const targetTableName = selectedOption.targetTable || tableName;
      const targetOptions = getCombinedOptionsForContext(targetTableName, schemas);
      const firstField = targetOptions.find((opt) => opt.fieldCategory === "column");

      const newGroup: FilterGroup = {
        id: generateFilterId(),
        operator: "and",
        relationContext: newRelationContext,
        conditions: [
          {
            id: generateFilterId(),
            field: firstField?.value || "",
            operator: "_eq",
            value: null,
            type: firstField?.fieldType ? mapDbTypeToFilterType(firstField.fieldType) : "string",
          },
        ],
      };

      // This will be handled differently in each component
      return { convertToGroup: true, newGroup };
    }

    return { convertToGroup: false };
  }

  return {
    onFieldSelectChange
  };
}