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
  const { getId } = useDatabase();

  const { getIdFieldName } = useDatabase();
  const {
    data: tablesData,
    pending: tablesPending,
    execute: executeFetchTables,
  } = useApi(() => "/table_definition", {
    query: {
      fields: ["*", "columns.*", "relations.*"].join(","),
      limit: 0,
      sort: [getIdFieldName()].join(","),
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
      } as TableSchema;
      delete schema[t.name]?.columns;
      delete schema[t.name]?.relations;
    }

    for (const t of input) {
      for (const col of t.columns || []) {
        schema[t.name]?.definition.push({
          ...col,
          fieldType: "column",
        } as TableDefinitionField);
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
        if (!rel.propertyName) continue;

        const directKey = `${sourceTable}:${rel.propertyName}`;
        if (!seenRelationKeys.has(directKey)) {
          schema[sourceTable]?.definition.push({
            ...rel,
            name: rel.propertyName,
            fieldType: "relation",
          } as TableDefinitionField);
          seenRelationKeys.add(directKey);
        }

        if (rel.inversePropertyName) {
          const targetTableId = typeof rel.targetTable === 'string'
            ? rel.targetTable
            : getId(rel.targetTable);

          const targetTableName = input.find(
            (t) => getId(t) === targetTableId
          )?.name;
          
          if (targetTableName) {
            const inverseKey = `${targetTableName}:${rel.inversePropertyName}`;
            if (!seenRelationKeys.has(inverseKey)) {
              const inverseRel = {
                ...rel,
                id: undefined,  // set undefined thay vì delete
                _id: undefined, // also clear MongoDB _id
                name: rel.inversePropertyName,
                propertyName: rel.inversePropertyName,
                inversePropertyName: rel.propertyName,
                sourceTable: rel.targetTable,
                targetTable: rel.sourceTable,
                type: inverseRelationType(rel.type),
                fieldType: "relation",
                isNullable: true,
              } as TableDefinitionField;
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
      
      if (a.fieldType === b.fieldType) {
        const aId = a.id ?? Number.MAX_SAFE_INTEGER;
        const bId = b.id ?? Number.MAX_SAFE_INTEGER;
        return aId - bId;
      }
      
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
    const { getIdFieldName } = useDatabase();

    const defaultExcluded = [
      "createdAt",
      "updatedAt",
      getIdFieldName(),
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

  function validate(
    record: Record<string, any>,
    customValidators?: Record<string, (value: any) => string | null>
  ): FormValidationResult {
    const errors: Record<string, string> = {};
    let isValid = true;

    for (const [key, value] of Object.entries(record)) {
      const field = getField(key);
      if (!field) continue;

      const isRelation = field.fieldType === "relation";
      const isInverse = isRelation && !!field.inversePropertyName;
      if (isInverse) continue;

      if (customValidators && customValidators[key]) {
        const customError = customValidators[key](value);
        if (customError) {
          errors[key] = customError;
          isValid = false;
          continue; // Skip default validation if custom validator fails
        }
      }

      const nullable = field.isNullable ?? true;
      const isGenerated = field.isGenerated === true;
      const isHidden = field.isHidden === true;

      const empty =
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim() === "");

      if (!nullable && !isGenerated && !isHidden && empty) {
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
      .map((field) => {
        const fieldName = field.propertyName || field.name;
        return fieldName ? `${fieldName}.*` : null;
      })
      .filter((field): field is string => field !== null);

    return ["*", ...relations].join(",");
  }

  function useFormChanges(): FormChangesState {
    const originalData = ref<Record<string, any>>({});

    function update(newData: Record<string, any>) {
      originalData.value = JSON.parse(JSON.stringify(newData));
    }

    function checkChanges(currentData: Record<string, any>): boolean {
      const original = JSON.stringify(originalData.value);
      const current = JSON.stringify(currentData);
      return original !== current;
    }

    function discardChanges(currentData: Record<string, any>): Record<string, any> {
      return JSON.parse(JSON.stringify(originalData.value));
    }

    return {
      originalData: readonly(originalData),
      update,
      checkChanges,
      discardChanges,
    };
  }

  const tableSchema = computed<TableSchema | null>(() => {
    if (!tableName) return null;
    return schemas.value[tableNameRef.value] || null;
  });

  return {
    schemas: readonly(schemas),
    schema: tableSchema,
    fetchSchema,
    schemaLoading: tablesPending,
    updateSchemas,

    definition,
    fieldMap,
    generateEmptyForm,
    validate,
    getIncludeFields,
    sortFieldsByOrder,
    useFormChanges,
  };
}
