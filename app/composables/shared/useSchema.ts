import type {
  TableApiResponse,
  SchemaCollection,
  TableSchema,
  TableDefinitionField,
  FormValidationResult,
  FormChangesState,
  RelationType,
} from "~/types/schema";

export function useSchema(tableName?: string | Ref<string>) {
  const schemas = useState<SchemaCollection>("schemas:data", () => ({}));

  // API for fetching tables
  const {
    data: tablesData,
    pending: tablesPending,
    execute: executeFetchTables,
  } = useApi(() => "/table_definition", {
    query: {
      fields: ["*", "columns.*", "relations.*"].join(","),
      limit: 0,
      sort: ["id"].join(","),
    },
    errorContext: "Fetch Tables",
  });

  async function fetchSchema() {
    await executeFetchTables();
    const tables: TableApiResponse[] = tablesData.value?.data || [];
    updateSchemas(tables);
  }

  function convertToEnfyraSchema(input: TableApiResponse[]): SchemaCollection {
    const schema: SchemaCollection = {};
    const seenRelationKeys = new Set<string>();

    for (const t of input) {
      schema[t.name] = {
        ...t,
        definition: [],
      };
      delete schema[t.name]?.columns;
      delete schema[t.name]?.relations;
    }

    for (const t of input) {
      for (const col of t.columns || []) {
        schema[t.name]?.definition.push({
          ...col,
          fieldType: "column",
        });
      }
    }

    for (const tableName in schema) {
      const def = schema[tableName]?.definition;

      const shouldInject = (name: string) =>
        !def?.some((d) => d.name === name && d.fieldType === "column");

      if (shouldInject("createdAt")) {
        def?.push({
          name: "createdAt",
          type: "timestamp",
          isNullable: false,
          isSystem: true,
          isUpdatable: false,
          isHidden: false,
          fieldType: "column",
          isVirtual: true,
        });
      }

      if (shouldInject("updatedAt")) {
        def?.push({
          name: "updatedAt",
          type: "timestamp",
          isNullable: false,
          isSystem: true,
          isUpdatable: false,
          isHidden: false,
          fieldType: "column",
          isVirtual: true,
        });
      }
    }

    for (const t of input) {
      for (const rel of t.relations || []) {
        const sourceTable = t.name;
        if (!rel.propertyName || !rel.targetTable || !rel.sourceTable) continue;

        const directKey = `${sourceTable}:${rel.propertyName}`;
        if (!seenRelationKeys.has(directKey)) {
          schema[sourceTable]?.definition.push({
            ...rel,
            name: rel.propertyName,
            fieldType: "relation",
          });
          seenRelationKeys.add(directKey);
        }

        if (rel.inversePropertyName) {
          const targetTableName = input.find(
            (t) => t.id === rel.targetTable.id
          )?.name;
          
          if (targetTableName) {
            const inverseKey = `${targetTableName}:${rel.inversePropertyName}`;
            if (!seenRelationKeys.has(inverseKey)) {
              const inverseRel: TableDefinitionField = {
                ...rel,
                id: undefined,  // set undefined thay vì delete
                name: rel.inversePropertyName,
                propertyName: rel.inversePropertyName,
                inversePropertyName: rel.propertyName,
                sourceTable: rel.targetTable,
                targetTable: rel.sourceTable,
                type: inverseRelationType(rel.type),
                fieldType: "relation",
                isNullable: true,
              };
              schema[targetTableName]?.definition.push(inverseRel);
              seenRelationKeys.add(inverseKey);
            }
          }
        }
      }
    }

    return schema;
  }

  function inverseRelationType(type: RelationType): RelationType {
    switch (type) {
      case "one-to-many":
        return "many-to-one";
      case "many-to-one":
        return "one-to-many";
      default:
        return type;
    }
  }

  function updateSchemas(tables: TableApiResponse[]) {
    schemas.value = convertToEnfyraSchema(tables);
  }

  // Table-specific functionality (only when tableName is provided)
  const tableNameRef = tableName
    ? isRef(tableName)
      ? tableName
      : ref(tableName)
    : ref("");

  const definition = computed<TableDefinitionField[]>(
    () => schemas.value[tableNameRef.value]?.definition || []
  );

  function sortFieldsByOrder(
    fields: TableDefinitionField[]
  ): TableDefinitionField[] {
    return [...fields].sort((a, b) => {
      if (a.fieldType === "column" && b.fieldType === "relation") return -1;
      if (a.fieldType === "relation" && b.fieldType === "column") return 1;
      return 0;
    });
  }

  const fieldMap = computed(() => {
    const map = new Map<string, TableDefinitionField>();
    for (const field of definition.value) {
      const key = field.name || field.propertyName;
      if (key) map.set(key, field);
    }
    return map;
  });

  function getField(key: string): TableDefinitionField | undefined {
    return fieldMap.value.get(key);
  }

  const editableFields = computed(() => {
    let fields = definition.value.filter((field) => {
      const key = field.name || field.propertyName;
      if (!key) return false;
      if (
        ["id", "createdAt", "updatedAt", "isSystem", "isRootAdmin"].includes(
          key
        )
      )
        return false;
      return true;
    });

    return sortFieldsByOrder(fields);
  });

  function generateEmptyForm(options?: {
    excluded?: string[];
  }): Record<string, any> {
    const { excluded = [] } = options || {};
    const result: Record<string, any> = {};

    const defaultExcluded = [
      "createdAt",
      "updatedAt",
      "id",
      "isSystem",
      "isRootAdmin",
    ];
    const allExcluded = [...defaultExcluded, ...excluded];

    for (const field of editableFields.value) {
      const key = field.name || field.propertyName;
      if (!key || allExcluded.includes(key)) continue;

      if (field.defaultValue !== undefined) {
        result[key] = field.defaultValue;
        continue;
      }

      if (field.fieldType === "relation" || field.relationType) {
        switch (field.relationType) {
          case "one-to-many":
          case "many-to-many":
            result[key] = [];
            break;
          case "many-to-one":
          case "one-to-one":
          default:
            result[key] = null;
            break;
        }
        continue;
      }

      const nullable = field.isNullable ?? true;
      if (nullable) {
        result[key] = null;
        continue;
      }

      switch (field.type) {
        case "boolean":
          result[key] = false;
          break;
        case "array":
          result[key] = [];
          break;
        case "int":
        case "number":
          result[key] = 0;
          break;
        default:
          result[key] = "";
      }
    }

    return result;
  }

  function validate(record: Record<string, any>): FormValidationResult {
    const errors: Record<string, string> = {};
    let isValid = true;

    for (const [key, value] of Object.entries(record)) {
      const field = getField(key);
      if (!field) continue;

      const isRelation = field.fieldType === "relation";
      const isInverse = isRelation && !!field.inversePropertyName;
      if (isInverse) continue;

      const nullable = field.isNullable ?? true;
      const isGenerated = field.isGenerated === true;

      const empty =
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim() === "");

      // Only validate as required if field is not nullable AND not auto-generated
      if (!nullable && !isGenerated && empty) {
        errors[key] = "This field is required";
        isValid = false;
      }
    }

    return { isValid, errors };
  }

  function getIncludeFields(): string {
    if (!definition.value.length) return "*";

    const relations = definition.value
      .filter((field) => field.fieldType === "relation")
      .map((field) => `${field.propertyName}.*`);

    return ["*", ...relations].join(",");
  }

  // Form change detection
  function useFormChanges(): FormChangesState {
    const originalData = ref<Record<string, any>>({});
    const hasChanges = ref(false);

    function update(newData: Record<string, any>) {
      originalData.value = JSON.parse(JSON.stringify(newData));
      hasChanges.value = false;
    }

    function checkChanges(currentData: Record<string, any>): boolean {
      // Deep comparison between original and current data
      const original = JSON.stringify(originalData.value);
      const current = JSON.stringify(currentData);
      hasChanges.value = original !== current;
      return hasChanges.value;
    }

    return {
      originalData: readonly(originalData),
      hasChanges: readonly(hasChanges),
      update,
      checkChanges,
    };
  }

  // If tableName provided, return single table schema
  const tableSchema = computed<TableSchema | null>(() => {
    if (!tableName) return null;
    return schemas.value[tableNameRef.value] || null;
  });

  return {
    // Schema data and management
    schemas: readonly(schemas),
    schema: tableSchema,
    fetchSchema,
    schemaLoading: tablesPending,
    updateSchemas,

    // Table-specific functions (only useful when tableName is provided)
    definition,
    fieldMap,
    generateEmptyForm,
    validate,
    getIncludeFields,
    sortFieldsByOrder,
    useFormChanges,
  };
}
