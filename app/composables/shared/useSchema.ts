import type {
  SchemaCollection,
  TableSchema,
  TableDefinitionField,
  FormValidationResult,
  FormChangesState,
  ColumnType,
} from "~/types/database";

const TIMESTAMP_FIELDS: { name: string; type: ColumnType }[] = [
  { name: "createdAt", type: "timestamp" },
  { name: "updatedAt", type: "timestamp" },
];

export function useSchema(tableName?: string | Ref<string>) {
  const schemas = useState<SchemaCollection>("schemas:data", () => ({}));
  const schemaLoading = ref(false);
  const { getIdFieldName } = useDatabase();

  const {
    execute: executeMetadata,
    data: metadataData,
  } = useApi<{ data: any[] }>("/metadata", {
    errorContext: "Fetch Schema",
  });

  async function fetchSchema() {
    if (Object.keys(schemas.value).length > 0) return;

    schemaLoading.value = true;
    try {
      await executeMetadata();
      processAndCacheSchemas(metadataData.value?.data || []);
    } catch (error) {
      console.error('[useSchema] Error fetching schema:', error);
    } finally {
      schemaLoading.value = false;
    }
  }

  function processAndCacheSchemas(tables: any[]) {
    for (const t of tables) {
      if (schemas.value[t.name]) continue;

      const definition: TableDefinitionField[] = [];

      (t.columns || []).forEach((col: any) => {
        definition.push({ ...col, fieldType: "column" } as TableDefinitionField);
      });

      TIMESTAMP_FIELDS.forEach(({ name, type }) => {
        if (!definition.some(d => d.name === name)) {
          definition.push({
            name,
            type,
            isNullable: false,
            isSystem: true,
            isUpdatable: false,
            isHidden: false,
            fieldType: "column",
            isVirtual: true,
          });
        }
      });

      (t.relations || []).forEach((rel: any) => {
        if (rel.propertyName) {
          definition.push({
            ...rel,
            name: rel.propertyName,
            fieldType: "relation",
            relationType: rel.type,
          } as TableDefinitionField);
        }
      });

      schemas.value[t.name] = {
        ...t,
        definition,
      } as TableSchema;
    }
  }

  function updateSchemas(tables: any[]) {
    processAndCacheSchemas(tables);
  }

  const tableNameRef = tableName
    ? isRef(tableName) ? tableName : ref(tableName)
    : ref("");

  const definition = computed<TableDefinitionField[]>(
    () => schemas.value[tableNameRef.value]?.definition || []
  );

  function sortFieldsByOrder(fields: TableDefinitionField[]): TableDefinitionField[] {
    return [...fields].sort((a, b) => {
      if (a.fieldType === "column" && b.fieldType === "relation") return -1;
      if (a.fieldType === "relation" && b.fieldType === "column") return 1;
      return (a.id ?? Infinity) - (b.id ?? Infinity);
    });
  }

  const fieldMap = computed(() => {
    const map = new Map<string, TableDefinitionField>();
    definition.value.forEach(f => {
      const key = f.name || f.propertyName;
      if (key) map.set(key, f);
    });
    return map;
  });

  function getField(key: string): TableDefinitionField | undefined {
    return fieldMap.value.get(key);
  }

  const editableFields = computed(() => {
    const excluded = ["id", "createdAt", "updatedAt", "isSystem", "isRootAdmin"];

    const foreignKeyColumns = new Set<string>();
    definition.value.forEach((field: any) => {
      if (field.fieldType === "relation" && field.foreignKeyColumn) {
        foreignKeyColumns.add(field.foreignKeyColumn);
      }
    });

    return sortFieldsByOrder(
      definition.value.filter(f => {
        const key = f.name || f.propertyName;
        return key && !excluded.includes(key) && !foreignKeyColumns.has(key);
      })
    );
  });

  function generateEmptyForm(options?: { excluded?: string[] }): Record<string, any> {
    const allExcluded = [
      "createdAt", "updatedAt", getIdFieldName(), "isSystem", "isRootAdmin",
      ...(options?.excluded || [])
    ];

    const result: Record<string, any> = {};

    editableFields.value.forEach(f => {
      const key = f.name || f.propertyName;
      if (!key || allExcluded.includes(key)) return;

      if (f.defaultValue !== undefined) {
        result[key] = f.defaultValue;
        return;
      }

      if (f.fieldType === "relation" || f.relationType) {
        result[key] = f.relationType && ["one-to-many", "many-to-many"].includes(f.relationType) ? [] : null;
        return;
      }

      if (f.isNullable ?? true) {
        result[key] = null;
        return;
      }

      switch (f.type) {
        case "boolean": result[key] = false; break;
        case "array": result[key] = []; break;
        case "int":
        case "number": result[key] = 0; break;
        default: result[key] = "";
      }
    });

    return result;
  }

  function validate(
    record: Record<string, any>,
    customValidators?: Record<string, (value: any) => string | null>
  ): FormValidationResult {
    const errors: Record<string, string> = {};
    let isValid = true;

    const foreignKeyColumns = new Set<string>();
    definition.value.forEach((field: any) => {
      if (field.fieldType === "relation" && field.foreignKeyColumn) {
        foreignKeyColumns.add(field.foreignKeyColumn);
      }
    });

    for (const [key, value] of Object.entries(record)) {
      if (foreignKeyColumns.has(key)) continue;

      const field = getField(key);
      if (!field) continue;
      if (field.fieldType === "relation" && field.inversePropertyName) continue;

      if (customValidators?.[key]) {
        const error = customValidators[key](value);
        if (error) {
          errors[key] = error;
          isValid = false;
          continue;
        }
      }

      const empty = value === null || value === undefined ||
        (typeof value === "string" && value.trim() === "");

      if (!(field.isNullable ?? true) && !field.isGenerated && !field.isHidden && empty) {
        errors[key] = "This field is required";
        isValid = false;
      }
    }

    return { isValid, errors };
  }

  function getIncludeFields(): string {
    if (!definition.value.length) return "*";

    const relations = definition.value
      .filter(f => f.fieldType === "relation")
      .map(f => f.propertyName || f.name)
      .filter(Boolean)
      .map(name => `${name}.*`);

    return ["*", ...relations].join(",");
  }

  function useFormChanges(): FormChangesState {
    const originalData = ref<Record<string, any>>({});

    return {
      originalData: readonly(originalData),
      update: (data) => { originalData.value = JSON.parse(JSON.stringify(data)); },
      checkChanges: (data) => JSON.stringify(originalData.value) !== JSON.stringify(data),
      discardChanges: () => JSON.parse(JSON.stringify(originalData.value)),
    };
  }

  const tableSchema = computed<TableSchema | null>(() =>
    tableName ? schemas.value[tableNameRef.value] || null : null
  );

  const schemaReady = computed(() =>
    tableName ? !!schemas.value[tableNameRef.value] : true
  );

  return {
    schemas: readonly(schemas),
    schema: tableSchema,
    fetchSchema,
    schemaLoading,
    updateSchemas,
    schemaReady,
    definition,
    fieldMap,
    generateEmptyForm,
    validate,
    getIncludeFields,
    sortFieldsByOrder,
    useFormChanges,
  };
}