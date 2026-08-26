import type {
  SchemaCollection,
  TableSchema,
  TableDefinitionField,
  FormValidationResult,
  FormChangesState,
} from "~/types/database";
import {
  CREATE_RECORD_SYSTEM_FIELDS,
  isCreateRecordSystemField,
} from "~/utils/schema/system-fields";

type MetadataDatabaseType = 'postgres' | 'mysql' | 'mongodb' | 'mariadb' | 'sqlite';
type MetadataDatabaseContext = {
  dbType: MetadataDatabaseType | null;
};
type MetadataResponse = {
  data?: TableSchema;
  dbType?: MetadataDatabaseType;
  enfyraVersion?: string | null;
};

const clientSchemaRequests = new Map<string, Promise<TableSchema | null>>();
let clientMetadataContextRequest: Promise<MetadataResponse | null> | null = null;

export function useSchema(tableName?: string | Ref<string>) {
  const schemas = useState<SchemaCollection>("schemas:data", () => ({}));
  const dbContext = useState<MetadataDatabaseContext>("database:context", () => ({
    dbType: null,
  }));
  const enfyraVersion = useState<string | null>("enfyra:version", () => null);
  const schemaEpoch = useState<number>("schemas:epoch", () => 0);
  const metadataContextFetched = useState<boolean>("metadata-context:fetched", () => false);
  const schemaLoading = ref(false);
  const requestedTableName = ref("");
  const localSchemaRequests = new Map<string, Promise<TableSchema | null>>();
  const {
    execute: executeMetadata,
  } = useApi<MetadataResponse>(() => `/metadata/${encodeURIComponent(requestedTableName.value)}`, {
    errorContext: "Fetch Schema",
    disableErrorPage: true,
    onError: (error: { status?: number }) => error.status === 404 || error.status === 503,
  });
  const { execute: executeMetadataContext } = useApi<MetadataResponse>("/metadata", {
    errorContext: "Fetch Metadata Context",
  });

  const tableNameRef = tableName
    ? isRef(tableName) ? tableName : ref(tableName)
    : ref("");

  async function requestSchema(name: string): Promise<TableSchema | null> {
    requestedTableName.value = name;
    const response = await executeMetadata() as MetadataResponse | null;
    if (!response?.data) return null;

    updateDatabaseContext(response);
    schemas.value = {
      ...schemas.value,
      [name]: response.data,
    };
    return response.data;
  }

  async function ensureMetadataContext(): Promise<MetadataResponse | null> {
    if (metadataContextFetched.value && dbContext.value.dbType) return {
      dbType: dbContext.value.dbType ?? undefined,
      enfyraVersion: enfyraVersion.value,
    };
    if (import.meta.client && clientMetadataContextRequest) {
      return clientMetadataContextRequest;
    }

    let request: Promise<MetadataResponse | null>;
    request = executeMetadataContext().then((rawResponse) => {
      const response = rawResponse as MetadataResponse | null;
      if (!response) return null;
      updateDatabaseContext(response);
      return response;
    }).finally(() => {
      if (import.meta.client && clientMetadataContextRequest === request) {
        clientMetadataContextRequest = null;
      }
    });
    if (import.meta.client) clientMetadataContextRequest = request;
    return request;
  }

  async function ensureSchema(
    name = tableNameRef.value,
    options?: { force?: boolean },
  ): Promise<TableSchema | null> {
    const normalizedName = name?.trim();
    if (!normalizedName) return null;
    if (!options?.force && schemas.value[normalizedName]) {
      return schemas.value[normalizedName];
    }

    const existingRequest = localSchemaRequests.get(normalizedName) ?? (
      import.meta.client ? clientSchemaRequests.get(normalizedName) : null
    );
    if (existingRequest) {
      schemaLoading.value = true;
      try {
        return await existingRequest;
      } finally {
        schemaLoading.value = false;
      }
    }

    schemaLoading.value = true;
    let request: Promise<TableSchema | null>;
    request = requestSchema(normalizedName).finally(() => {
      schemaLoading.value = false;
      localSchemaRequests.delete(normalizedName);
      if (import.meta.client && clientSchemaRequests.get(normalizedName) === request) {
        clientSchemaRequests.delete(normalizedName);
      }
    });
    localSchemaRequests.set(normalizedName, request);
    if (import.meta.client) clientSchemaRequests.set(normalizedName, request);
    return request;
  }

  function updateDatabaseContext(metadata: MetadataResponse | null | undefined) {
    if (!metadata) return;
    if (metadata.dbType !== undefined) {
      dbContext.value = { dbType: metadata.dbType ?? null };
      metadataContextFetched.value = Boolean(dbContext.value.dbType);
    }
    if (metadata.enfyraVersion !== undefined) {
      enfyraVersion.value = metadata.enfyraVersion?.trim() || null;
    }
  }

  function invalidateSchemas(names?: string | string[]) {
    const targets = names == null ? null : new Set(Array.isArray(names) ? names : [names]);
    if (!targets) {
      schemas.value = {};
      localSchemaRequests.clear();
      clientSchemaRequests.clear();
    } else {
      schemas.value = Object.fromEntries(
        Object.entries(schemas.value).filter(([name]) => !targets.has(name)),
      );
      for (const name of targets) localSchemaRequests.delete(name);
      for (const name of targets) clientSchemaRequests.delete(name);
    }
    schemaEpoch.value += 1;
  }

  async function refreshSchema(name = tableNameRef.value) {
    invalidateSchemas(name);
    return ensureSchema(name, { force: true });
  }

  watch(
    [tableNameRef, schemaEpoch],
    ([name]) => {
      if (name) void ensureSchema(name);
    },
    { immediate: true },
  );

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

  function canReadField(field: TableDefinitionField): boolean {
    return field.metadataAccess?.read !== false;
  }

  function canWriteField(field: TableDefinitionField): boolean {
    const access = field.metadataAccess;
    if (!access) return true;
    return access.create === true || access.update === true;
  }

  const editableFields = computed(() => {
    return sortFieldsByOrder(
      definition.value.filter(f => {
        const key = f.name || f.propertyName;
        return key && !isCreateRecordSystemField(key) && canWriteField(f);
      })
    );
  });

  function generateEmptyForm(options?: { excluded?: string[] }): Record<string, any> {
    const allExcluded = new Set([
      ...CREATE_RECORD_SYSTEM_FIELDS,
      ...(options?.excluded || []),
    ]);

    const result: Record<string, any> = {};

    editableFields.value.forEach(f => {
      const key = f.name || f.propertyName;
      if (!key || allExcluded.has(key)) return;

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
        case "float":
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

    for (const [key, value] of Object.entries(record)) {
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

  async function getIncludeFields(): Promise<string> {
    await ensureSchema();
    if (!definition.value.length) return "*";

    const relations = definition.value
      .filter(f => f.fieldType === "relation" && canReadField(f))
      .map(f => f.propertyName || f.name)
      .filter(Boolean)
      .map(name => `${name}.*`);

    return ["*", ...relations].join(",");
  }

  async function getColumnFields(): Promise<string> {
    await ensureSchema();
    if (!definition.value.length) return "*";

    const columnFields = definition.value
      .filter(f => f.fieldType === "column" && f.name && canReadField(f))
      .map(f => f.name)
      .filter(Boolean);

    return columnFields.length > 0 ? columnFields.join(",") : "*";
  }

  function useFormChanges(): FormChangesState {
    const originalData = ref<Record<string, any>>({});

    return {
      originalData: readonly(originalData),
      update: (data) => { originalData.value = JSON.parse(JSON.stringify(data)); },
      checkChanges: (data) => {
        const normalize = (obj: Record<string, any>) => {
          const result: Record<string, any> = {};
          for (const key of Object.keys(obj)) {
            result[key] = obj[key] === "" ? null : obj[key];
          }
          return result;
        };
        return JSON.stringify(normalize(originalData.value)) !== JSON.stringify(normalize(data));
      },
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
    enfyraVersion: readonly(enfyraVersion),
    ensureSchema,
    ensureMetadataContext,
    refreshSchema,
    invalidateSchemas,
    schemaLoading,
    schemaReady,
    definition,
    fieldMap,
    generateEmptyForm,
    validate,
    getIncludeFields,
    getColumnFields,
    sortFieldsByOrder,
    useFormChanges,
  };
}
