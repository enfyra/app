<template>
  <div class="space-y-6">
    <!-- Schema Structure -->
    <div
      class="bg-gradient-to-r from-background/50 to-muted/10 rounded-xl border border-muted/30 p-4"
    >
      <div class="flex items-center gap-2 mb-4">
        <UIcon name="lucide:layers" class="text-info" size="18" />
        <h3 class="text-lg font-semibold text-foreground">Schema Structure</h3>
      </div>
      <ClientOnly>
        <VueJsonPretty
          :data="schemaStructure"
          :show-length="true"
          :show-line="false"
          :deep="4"
          theme="dark"
          class="bg-gray-900 rounded-lg p-4"
        />
      </ClientOnly>
    </div>

    <!-- Example POST Request -->
    <div
      class="bg-gradient-to-r from-green-500/5 to-green-400/2 rounded-xl border border-green-200/30 dark:border-green-800/30 p-4"
    >
      <div class="flex items-center gap-2 mb-4">
        <UIcon name="lucide:code" class="text-green-500" size="18" />
        <h3 class="text-lg font-semibold text-foreground">
          Example POST Request
        </h3>
      </div>
      <ClientOnly>
        <VueJsonPretty
          :data="examplePayload"
          :show-length="true"
          :show-line="false"
          :deep="3"
          theme="dark"
          class="bg-gray-900 rounded-lg p-4"
        />
      </ClientOnly>
    </div>

    <!-- Example PATCH Request -->
    <div
      class="bg-gradient-to-r from-yellow-500/5 to-yellow-400/2 rounded-xl border border-yellow-200/30 dark:border-yellow-800/30 p-4"
    >
      <div class="flex items-center gap-2 mb-4">
        <UIcon name="lucide:edit" class="text-yellow-500" size="18" />
        <h3 class="text-lg font-semibold text-foreground">
          Example PATCH Request
        </h3>
        <span class="text-xs text-muted-foreground ml-auto">
          Only send fields you want to update
        </span>
      </div>
      <ClientOnly>
        <VueJsonPretty
          :data="examplePatchPayload"
          :show-length="true"
          :show-line="false"
          :deep="3"
          theme="dark"
          class="bg-gray-900 rounded-lg p-4"
        />
      </ClientOnly>
    </div>

    <!-- Field Validation Rules -->
    <div
      v-if="validationRules.length > 0"
      class="bg-gradient-to-r from-secondary-500/5 to-secondary-400/2 rounded-xl border border-secondary-200/30 dark:border-secondary-800/30 p-4"
    >
      <div class="flex items-center gap-2 mb-4">
        <UIcon
          name="lucide:shield-check"
          class="text-secondary-500"
          size="18"
        />
        <h3 class="text-lg font-semibold text-foreground">Validation Rules</h3>
      </div>
      <ClientOnly>
        <VueJsonPretty
          :data="validationRules"
          :show-length="true"
          :show-line="false"
          :deep="3"
          theme="dark"
          class="bg-gray-900 rounded-lg p-4"
        />
      </ClientOnly>
    </div>

    <!-- Relations -->
    <div
      v-if="relations.length > 0"
      class="bg-gradient-to-r from-purple-500/5 to-purple-400/2 rounded-xl border border-purple-200/30 dark:border-purple-800/30 p-4"
    >
      <div class="flex items-center gap-2 mb-4">
        <UIcon name="lucide:git-branch" class="text-purple-500" size="18" />
        <h3 class="text-lg font-semibold text-foreground">Relations</h3>
      </div>
      <ClientOnly>
        <VueJsonPretty
          :data="relations"
          :show-length="true"
          :show-line="false"
          :deep="2"
          theme="dark"
          class="bg-gray-900 rounded-lg p-4"
        />
      </ClientOnly>
    </div>

    <!-- Loading State -->
    <div v-if="!schemaData" class="flex items-center justify-center h-64">
      <div class="text-center">
        <UIcon
          name="lucide:database-zap"
          class="w-12 h-12 text-muted-foreground mx-auto mb-2"
        />
        <p class="text-muted-foreground">Loading schema...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";

interface Props {
  tableName: string;
}

const props = defineProps<Props>();

// Get global schemas for finding target tables by ID
const { schemas: allSchemas } = useSchema();

// Get schema data with error handling
const schemaComposable = computed(() => {
  try {
    const schema = useSchema(props.tableName);
    return schema;
  } catch (error) {
    return null;
  }
});

// Get schema data
const schemaData = computed(() => {
  if (!schemaComposable.value) {
    return null;
  }

  try {
    // definition is already a computed ref, so we use .value
    const definitions = unref(schemaComposable.value.definition);

    // Keep all definitions for Schema Structure, but will filter in other sections
    return definitions;
  } catch (error) {
    return null;
  }
});

// Schema structure for documentation
const schemaStructure = computed(() => {
  if (!schemaData.value || !Array.isArray(schemaData.value)) return {};

  const structure: Record<string, any> = {};

  // Sort fields: regular columns first, then relations, then system fields last
  const sortedFields = [...schemaData.value].sort((a: any, b: any) => {
    const aName = a.name || a.propertyName;
    const bName = b.name || b.propertyName;
    
    const systemFields = ['createdAt', 'updatedAt'];
    const aIsSystem = systemFields.includes(aName);
    const bIsSystem = systemFields.includes(bName);
    const aIsRelation = a.fieldType === 'relation';
    const bIsRelation = b.fieldType === 'relation';
    
    // Assign priority: 1 = regular columns, 2 = relations, 3 = system fields
    const getPriority = (isSystem: boolean, isRelation: boolean) => {
      if (isSystem) return 3;
      if (isRelation) return 2;
      return 1;
    };
    
    const aPriority = getPriority(aIsSystem, aIsRelation);
    const bPriority = getPriority(bIsSystem, bIsRelation);
    
    return aPriority - bPriority;
  });

  sortedFields.forEach((field: any) => {
    const fieldName = field.name || field.propertyName;
    if (!fieldName) return;
    
    // Skip isSystem from all tables
    if (fieldName === 'isSystem') return;
    
    // Skip isRootAdmin only from user_definition table
    if (fieldName === 'isRootAdmin' && props.tableName === 'user_definition') return;

    // Get target table name for relations
    let targetTableName = null;
    if (field.targetTable) {
      if (typeof field.targetTable === 'string') {
        targetTableName = field.targetTable;
      } else if (field.targetTable.name) {
        targetTableName = field.targetTable.name;
      } else if (field.targetTable.id && schemaComposable.value) {
        // Try to find table name by ID
        const targetSchema = Object.values(allSchemas.value).find((schema: any) => schema.id === field.targetTable.id);
        if (targetSchema && (targetSchema as any).name) {
          targetTableName = (targetSchema as any).name;
        }
      }
    }

    structure[fieldName] = {
      type: field.type || field.fieldType || "unknown",
      fieldType: field.fieldType || "column",
      nullable: field.isNullable || false,
      defaultValue: field.defaultValue || null,
      isGenerated: field.isGenerated || false,
      isPrimary: field.isPrimary || false,
      ...(field.maxLength && { maxLength: field.maxLength }),
      ...(field.validation && { validation: field.validation }),
      ...(field.options && { options: field.options }),
      ...(field.relationType && { relationType: field.relationType }),
      ...(targetTableName && { targetTable: targetTableName }),
    };
  });

  return structure;
});

// Example payload for POST request
const examplePayload = computed(() => {
  if (!schemaData.value || !Array.isArray(schemaData.value)) {
    return {};
  }

  const example: Record<string, any> = {};

  schemaData.value.forEach((field: any) => {
    const fieldName = field.name || field.propertyName;
    if (!fieldName) return;

    // Skip auto-generated fields for POST example  
    if (field.isGenerated) return;
    
    // Skip system fields
    if (["createdAt", "updatedAt", "id"].includes(fieldName)) return;
    
    // Skip isSystem from all tables
    if (fieldName === 'isSystem') return;
    
    // Skip isRootAdmin only from user_definition table
    if (fieldName === 'isRootAdmin' && props.tableName === 'user_definition') return;

    // Handle relations differently
    if (field.fieldType === "relation") {
      // Get target table name for relation example
      let targetTableName = "unknown";
      if (field.targetTable) {
        if (typeof field.targetTable === 'string') {
          targetTableName = field.targetTable;
        } else if (field.targetTable.name) {
          targetTableName = field.targetTable.name;
        } else if (field.targetTable.id && schemaComposable.value) {
          const targetSchema = Object.values(allSchemas.value).find((schema: any) => schema.id === field.targetTable.id);
          if (targetSchema && (targetSchema as any).name) {
            targetTableName = (targetSchema as any).name;
          }
        }
      }
      
      // Check relation type to determine format
      const relationType = field.type || field.relationType;
      if (relationType === 'one-to-many' || relationType === 'many-to-many') {
        example[fieldName] = [{ id: `${targetTableName}-id` }];
      } else {
        example[fieldName] = { id: `${targetTableName}-id` };
      }
      return;
    }

    switch (field.type?.toLowerCase()) {
      case "varchar":
      case "text":
      case "richtext":
        example[fieldName] = `Example ${fieldName}`;
        break;
      case "int":
        example[fieldName] = 123;
        break;
      case "float":
        example[fieldName] = 123.45;
        break;
      case "boolean":
        example[fieldName] = true;
        break;
      case "date":
        example[fieldName] = new Date().toISOString().split("T")[0];
        break;
      case "timestamp":
        example[fieldName] = new Date().toISOString();
        break;
      case "uuid":
        example[fieldName] = "550e8400-e29b-41d4-a716-446655440000";
        break;
      case "array-select":
        example[fieldName] = field.options ? [field.options[0]] : ["option1"];
        break;
      case "enum":
        example[fieldName] = field.options ? field.options[0] : "value1";
        break;
      default:
        if (field.defaultValue !== undefined) {
          example[fieldName] = field.defaultValue;
        } else {
          example[fieldName] = `${field.type}_value`;
        }
    }
  });

  return example;
});

// Example patch payload - show partial update with 1-2 fields
const examplePatchPayload = computed(() => {
  if (!schemaData.value || !Array.isArray(schemaData.value)) {
    return {};
  }

  const example: Record<string, any> = {};
  let fieldsAdded = 0;
  const maxFields = 2; // Show only 1-2 fields for PATCH example

  schemaData.value.forEach((field: any) => {
    if (fieldsAdded >= maxFields) return;
    
    const fieldName = field.name || field.propertyName;
    if (!fieldName) return;

    // Skip auto-generated fields, system fields 
    if (field.isGenerated) return;
    if (["createdAt", "updatedAt", "id"].includes(fieldName)) return;
    if (fieldName === 'isSystem') return;
    if (fieldName === 'isRootAdmin' && props.tableName === 'user_definition') return;

    // Handle relations
    if (field.fieldType === "relation") {
      let targetTableName = "unknown";
      if (field.targetTable) {
        if (typeof field.targetTable === 'string') {
          targetTableName = field.targetTable;
        } else if (field.targetTable.name) {
          targetTableName = field.targetTable.name;
        } else if (field.targetTable.id && schemaComposable.value) {
          const targetSchema = Object.values(allSchemas.value).find((schema: any) => schema.id === field.targetTable.id);
          if (targetSchema && (targetSchema as any).name) {
            targetTableName = (targetSchema as any).name;
          }
        }
      }
      
      // Check relation type to determine format
      const relationType = field.type || field.relationType;
      if (relationType === 'one-to-many' || relationType === 'many-to-many') {
        example[fieldName] = [{ id: `${targetTableName}-id` }];
      } else {
        example[fieldName] = { id: `${targetTableName}-id` };
      }
      fieldsAdded++;
      return;
    }

    // Add one example field for PATCH
    switch (field.type?.toLowerCase()) {
      case "varchar":
      case "text":
        example[fieldName] = `Updated ${fieldName}`;
        fieldsAdded++;
        break;
      case "int":
        example[fieldName] = 456;
        fieldsAdded++;
        break;
      case "boolean":
        example[fieldName] = false;
        fieldsAdded++;
        break;
      default:
        if (fieldsAdded === 0) { // Ensure at least one field
          example[fieldName] = `updated_${field.type}_value`;
          fieldsAdded++;
        }
    }
  });

  return example;
});

// Validation rules
const validationRules = computed(() => {
  if (!schemaData.value || !Array.isArray(schemaData.value)) {
    return [];
  }

  const rules: Array<{ field: string; rules: string[] }> = [];

  schemaData.value.forEach((field: any) => {
    const fieldName = field.name || field.propertyName;
    if (!fieldName) return;

    // Skip system fields for validation rules
    if (["createdAt", "updatedAt", "id"].includes(fieldName)) return;
    
    // Skip isSystem from all tables
    if (fieldName === 'isSystem') return;
    
    // Skip isRootAdmin only from user_definition table
    if (fieldName === 'isRootAdmin' && props.tableName === 'user_definition') return;

    const fieldRules: string[] = [];

    if (!field.isNullable && !field.defaultValue && !field.isGenerated) {
      fieldRules.push("required");
    }

    if (field.maxLength) {
      fieldRules.push(`max_length: ${field.maxLength}`);
    }

    if (field.validation) {
      fieldRules.push(`validation: ${field.validation}`);
    }

    if (field.type === "uuid") {
      fieldRules.push("format: uuid");
    }

    if (field.options) {
      fieldRules.push(`allowed_values: [${field.options.join(", ")}]`);
    }

    if (fieldRules.length > 0) {
      rules.push({
        field: fieldName,
        rules: fieldRules,
      });
    }
  });

  return rules;
});

// Relations
const relations = computed(() => {
  if (!schemaData.value || !Array.isArray(schemaData.value)) return [];

  return schemaData.value
    .filter((field: any) => field.fieldType === "relation")
    .map((field: any) => {
      // Get target table name
      let targetTableName = "unknown";
      if (field.targetTable) {
        if (typeof field.targetTable === 'string') {
          targetTableName = field.targetTable;
        } else if (field.targetTable.name) {
          targetTableName = field.targetTable.name;
        } else if (field.targetTable.id && schemaComposable.value) {
          // Try to find table name by ID
          const targetSchema = Object.values(allSchemas.value).find((schema: any) => schema.id === field.targetTable.id);
          if (targetSchema && (targetSchema as any).name) {
            targetTableName = (targetSchema as any).name;
          }
        }
      }

      return {
        name: field.name || field.propertyName,
        type: field.type || field.relationType || "many-to-one", // default relation type
        targetTable: targetTableName,
        nullable: field.isNullable || false,
      };
    });
});
</script>
