import { ref, computed, watch, type Ref } from "vue";
import type { SchemaCollection, TableDefinitionField } from "~/types/schema";
import { isRefSchemaCollection } from "~/utils/common/type-guards";

export function useDataTableVisibility(
  tableName: string,
  schemas: Ref<SchemaCollection> | any
) {
  const hiddenColumns = ref<Set<string>>(new Set());

  const visibleColumns = computed(() => {
    if (!isRefSchemaCollection(schemas)) return new Set();
    
    const schema = schemas.value[tableName];
    if (!schema?.definition) return new Set();

    const columnFields = schema.definition
      .filter((field: TableDefinitionField) => field.fieldType === "column")
      .map((field: TableDefinitionField) => field.name)
      .filter((name: string | undefined): name is string => !!name);

    return new Set(
      columnFields.filter((field: string) => !hiddenColumns.value.has(field))
    );
  });

  const loadColumnVisibility = (
    tableName: string,
    columnFields: string[]
  ): { hidden: Set<string>; hasSavedState: boolean } => {
    try {
      const saved = localStorage.getItem(`columnVisibility_${tableName}`);
      if (saved !== null) {
        const savedHiddenColumns = JSON.parse(saved);
        const validHiddenColumns = savedHiddenColumns.filter((col: string) =>
          columnFields.includes(col)
        );
        return { hidden: new Set(validHiddenColumns), hasSavedState: true };
      }
    } catch (error) {
      console.warn(
        "Failed to load column visibility from localStorage:",
        error
      );
    }
    return { hidden: new Set(), hasSavedState: false };
  };

  const saveColumnVisibility = (tableName: string, hiddenCols: Set<string>) => {
    try {
      localStorage.setItem(
        `columnVisibility_${tableName}`,
        JSON.stringify(Array.from(hiddenCols))
      );
    } catch (error) {
      console.warn("Failed to save column visibility to localStorage:", error);
    }
  };

  watch(
    () => isRefSchemaCollection(schemas) ? schemas.value[tableName] : null,
    (schema) => {
      if (schema?.definition) {
        const columnFields = schema.definition
          .filter((field: TableDefinitionField) => field.fieldType === "column")
          .map((field: TableDefinitionField) => field.name)
          .filter((name: string | undefined): name is string => !!name);

        const { hidden } = loadColumnVisibility(tableName, columnFields);
        const nextHidden = new Set(hidden);

        let needsSave = false;
        if (columnFields.length >= 7) {
          ["createdAt", "updatedAt"].forEach((fieldName) => {
            if (columnFields.includes(fieldName) && !nextHidden.has(fieldName)) {
              nextHidden.add(fieldName);
              needsSave = true;
            }
          });
        }

        hiddenColumns.value = nextHidden;
        if (needsSave) {
          saveColumnVisibility(tableName, nextHidden);
        }
      }
    },
    { immediate: true }
  );

  function toggleColumnVisibility(columnName: string) {
    if (hiddenColumns.value.has(columnName)) {
      hiddenColumns.value.delete(columnName); // Show column
    } else {
      hiddenColumns.value.add(columnName); // Hide column
    }

    hiddenColumns.value = new Set(hiddenColumns.value);

    saveColumnVisibility(tableName, hiddenColumns.value);
  }

  const columnDropdownItems = computed(() => {
    if (!isRefSchemaCollection(schemas)) return [];
    
    const schema = schemas.value[tableName];
    if (!schema?.definition) return [];

    const items = schema.definition
      .filter((field: TableDefinitionField) => field.fieldType === "column")
      .filter((field: TableDefinitionField) => !!field.name)
      .map((field: TableDefinitionField) => ({
        label: field.label || field.name || '',
        type: "checkbox" as const,
        get checked() {
          return !hiddenColumns.value.has(field.name!); // checked = not hidden
        },
        onToggle: () => {
          toggleColumnVisibility(field.name!);
        },
      }));

    return items;
  });

  return {
    hiddenColumns,
    visibleColumns,
    toggleColumnVisibility,
    columnDropdownItems,
  };
}
