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

        const visibleFieldsAfterTimestampHide = columnFields.filter(
          (field: string) => !nextHidden.has(field)
        );
        
        if (columnFields.length >= 10 && visibleFieldsAfterTimestampHide.length >= 10) {
          
          const sortedFields = [...columnFields].sort((a, b) => {
            
            const aField = schema.definition.find((f: TableDefinitionField) => f.name === a && f.fieldType === "column");
            const bField = schema.definition.find((f: TableDefinitionField) => f.name === b && f.fieldType === "column");

            if (a.toLowerCase() === 'id') return -1;
            if (b.toLowerCase() === 'id') return 1;

            const aCreatedAt = aField?.createdAt ? new Date(aField.createdAt).getTime() : 0;
            const bCreatedAt = bField?.createdAt ? new Date(bField.createdAt).getTime() : 0;
            if (aCreatedAt !== bCreatedAt) return aCreatedAt - bCreatedAt;
            return a.localeCompare(b);
          });

          const fieldsToKeep = sortedFields
            .filter((field) => !nextHidden.has(field))
            .slice(0, 10);

          columnFields.forEach((fieldName: string) => {
            if (!fieldsToKeep.includes(fieldName) && !nextHidden.has(fieldName)) {
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
      hiddenColumns.value.delete(columnName); 
    } else {
      hiddenColumns.value.add(columnName); 
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
          return !hiddenColumns.value.has(field.name!); 
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
