<template>
  <div class="min-w-0 space-y-4">
    <CommonLoadingState v-if="schemaLoading" title="Loading schema…" context="modal" />
    <CommonEmptyState
      v-else-if="!schemaData"
      title="No schema available"
      icon="lucide:database"
      variant="naked"
      size="sm"
    />
    <template v-else>
      <UTabs v-model="activeTab" :items="tabs" variant="link" color="primary" :content="false" />
      <div class="flex min-w-0 items-center justify-between gap-3">
        <div class="min-w-0">
          <h3 class="text-sm font-medium text-highlighted">{{ activeSection.title }}</h3>
          <p class="mt-1 text-xs text-muted">{{ activeSection.hint }}</p>
        </div>
        <UButton
          :icon="copied ? 'lucide:check' : 'lucide:copy'"
          :label="copied ? 'Copied' : 'Copy JSON'"
          color="neutral"
          variant="outline"
          size="xs"
          class="relative pointer-coarse:before:absolute pointer-coarse:before:-inset-y-2 pointer-coarse:before:inset-x-0 pointer-coarse:before:content-['']"
          loading-auto
          @click="copy(activeJson)"
        />
      </div>
      <div class="min-w-0 overflow-x-auto rounded-[var(--radius-control)] border border-default bg-muted p-3 sm:p-4">
        <VueJsonPretty
          :key="activeTab"
          class="schema-json min-w-max"
          :data="activeSection.data"
          :theme="colorMode.value === 'dark' ? 'dark' : 'light'"
          :show-length="true"
          :show-line="false"
          :deep="activeTab === 'structure' ? 1 : 3"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import VueJsonPretty from "vue-json-pretty";
import { useClipboard } from '@vueuse/core';
import "vue-json-pretty/lib/styles.css";
import { getTargetTableName } from "~/utils/schema";

interface Props {
  tableName: string;
}

const props = defineProps<Props>();
const { isMongoDB } = useDatabase();
const colorMode = useColorMode();
const activeTab = ref('structure');
const { copy, copied } = useClipboard({ legacy: true });

const {
  schemas: allSchemas,
  definition,
  schemaLoading,
} = useSchema(toRef(props, 'tableName'));

const schemaData = computed(() => definition.value || null);

const schemaStructure = computed(() => {
  if (!schemaData.value || !Array.isArray(schemaData.value)) return {};

  const structure: Record<string, any> = {};

  const sortedFields = [...schemaData.value].sort((a: any, b: any) => {
    const aName = a.name || a.propertyName;
    const bName = b.name || b.propertyName;
    
    const systemFields = ['createdAt', 'updatedAt'];
    const aIsSystem = systemFields.includes(aName);
    const bIsSystem = systemFields.includes(bName);
    const aIsRelation = a.fieldType === 'relation';
    const bIsRelation = b.fieldType === 'relation';

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

    if (fieldName === 'isSystem') return;

    if (fieldName === 'isRootAdmin' && props.tableName === 'enfyra_user') return;

    const targetTableName = getTargetTableName(field, allSchemas.value);

    structure[fieldName] = {
      type: field.type || field.fieldType || "unknown",
      fieldType: field.fieldType || "column",
      nullable: field.isNullable || false,
      defaultValue: field.defaultValue || null,
      isGenerated: field.isGenerated || false,
      isPrimary: field.isPrimary || false,
      ...(field.maxLength && { maxLength: field.maxLength }),
      ...(field.validation && { validation: field.validation }),
      ...(field.options && Array.isArray(field.options) && { options: field.options }),
      ...(field.relationType && { relationType: field.relationType }),
      ...(targetTableName && { targetTable: targetTableName }),
    };
  });

  return structure;
});

const examplePayload = computed(() => {
  if (!schemaData.value || !Array.isArray(schemaData.value)) {
    return {};
  }

  const example: Record<string, any> = {};

  schemaData.value.forEach((field: any) => {
    const fieldName = field.name || field.propertyName;
    if (!fieldName) return;

    if (field.isGenerated) return;

    if (["createdAt", "updatedAt", "id"].includes(fieldName)) return;

    if (fieldName === 'isSystem') return;

    if (fieldName === 'isRootAdmin' && props.tableName === 'enfyra_user') return;

    if (field.fieldType === "relation") {

      const targetTableName = getTargetTableName(field, allSchemas.value) || "unknown";

      const relationType = field.type || field.relationType;
      if (relationType === 'one-to-many' || relationType === 'many-to-many') {
        example[fieldName] = [{ id: `${targetTableName}-id` }];
      } else {
        example[fieldName] = { id: `${targetTableName}-id` };
      }
      return;
    }

    switch (field.type?.toLowerCase()) {
      case "string":
      case "varchar":
      case "text":
      case "longtext":
      case "richtext":
      case "code":
        example[fieldName] = `Example ${fieldName}`;
        break;
      case "int":
        example[fieldName] = 123;
        break;
      case "bigint":
      case "long":
        example[fieldName] = "9223372036854775807";
        break;
      case "float":
      case "double":
        example[fieldName] = 123.45;
        break;
      case "boolean":
      case "bool":
        example[fieldName] = true;
        break;
      case "date":
        example[fieldName] = isMongoDB.value
          ? new Date().toISOString()
          : new Date().toISOString().split("T")[0];
        break;
      case "datetime":
      case "timestamp":
        example[fieldName] = new Date().toISOString();
        break;
      case "uuid":
        example[fieldName] = "550e8400-e29b-41d4-a716-446655440000";
        break;
      case "objectid":
        example[fieldName] = "507f1f77bcf86cd799439011";
        break;
      case "object":
      case "simple-json":
      case "json":
        example[fieldName] = { key: "value" };
        break;
      case "array":
        example[fieldName] = ["value1", "value2"];
        break;
      case "array-select":
        example[fieldName] = (field.options && Array.isArray(field.options)) ? [field.options[0]] : ["option1"];
        break;
      case "enum":
        example[fieldName] = (field.options && Array.isArray(field.options)) ? field.options[0] : "value1";
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

const examplePatchPayload = computed(() => {
  if (!schemaData.value || !Array.isArray(schemaData.value)) {
    return {};
  }

  const example: Record<string, any> = {};
  let fieldsAdded = 0;
  const maxFields = 2; 

  schemaData.value.forEach((field: any) => {
    if (fieldsAdded >= maxFields) return;
    
    const fieldName = field.name || field.propertyName;
    if (!fieldName) return;

    if (field.isGenerated) return;
    if (["createdAt", "updatedAt", "id"].includes(fieldName)) return;
    if (fieldName === 'isSystem') return;
    if (fieldName === 'isRootAdmin' && props.tableName === 'enfyra_user') return;

    if (field.fieldType === "relation") {
      const targetTableName = getTargetTableName(field, allSchemas.value) || "unknown";

      const relationType = field.type || field.relationType;
      if (relationType === 'one-to-many' || relationType === 'many-to-many') {
        example[fieldName] = [{ id: `${targetTableName}-id` }];
      } else {
        example[fieldName] = { id: `${targetTableName}-id` };
      }
      fieldsAdded++;
      return;
    }

    switch (field.type?.toLowerCase()) {
      case "string":
      case "varchar":
      case "text":
      case "longtext":
      case "richtext":
      case "code":
        example[fieldName] = `Updated ${fieldName}`;
        fieldsAdded++;
        break;
      case "int":
        example[fieldName] = 456;
        fieldsAdded++;
        break;
      case "bigint":
      case "long":
        example[fieldName] = "9223372036854775806";
        fieldsAdded++;
        break;
      case "float":
      case "double":
        example[fieldName] = 456.78;
        fieldsAdded++;
        break;
      case "boolean":
      case "bool":
        example[fieldName] = false;
        fieldsAdded++;
        break;
      case "object":
      case "simple-json":
      case "json":
        example[fieldName] = { updated: true };
        fieldsAdded++;
        break;
      case "array":
        example[fieldName] = ["updated"];
        fieldsAdded++;
        break;
      default:
        if (fieldsAdded === 0) { 
          example[fieldName] = `updated_${field.type}_value`;
          fieldsAdded++;
        }
    }
  });

  return example;
});

const validationRules = computed(() => {
  if (!schemaData.value || !Array.isArray(schemaData.value)) {
    return [];
  }

  const rules: Array<{ field: string; rules: string[] }> = [];

  schemaData.value.forEach((field: any) => {
    const fieldName = field.name || field.propertyName;
    if (!fieldName) return;

    if (["createdAt", "updatedAt", "id"].includes(fieldName)) return;

    if (fieldName === 'isSystem') return;

    if (fieldName === 'isRootAdmin' && props.tableName === 'enfyra_user') return;

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

    if (field.options && Array.isArray(field.options)) {
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

const relations = computed(() => {
  if (!schemaData.value || !Array.isArray(schemaData.value)) return [];

  return schemaData.value
    .filter((field: any) => field.fieldType === "relation")
    .map((field: any) => {
      const targetTableName = getTargetTableName(field, allSchemas.value) || "unknown";

      return {
        name: field.name || field.propertyName,
        type: field.type || field.relationType || "many-to-one",
        targetTable: targetTableName,
        nullable: field.isNullable || false,
      };
    });
});
const sections = computed(() => [
  {
    value: 'structure', label: 'Fields', icon: 'lucide:table-2',
    title: 'Field definitions',
    hint: `${Object.keys(schemaStructure.value).length} fields · Expand a field to inspect its definition.`,
    data: schemaStructure.value,
  },
  {
    value: 'post', label: 'POST', icon: 'lucide:plus',
    title: 'Create a record', hint: 'Example request body for creating a record.', data: examplePayload.value,
  },
  {
    value: 'patch', label: 'PATCH', icon: 'lucide:pencil',
    title: 'Update a record', hint: 'Send only the fields you want to update.', data: examplePatchPayload.value,
  },
  ...(validationRules.value.length ? [{
    value: 'rules', label: 'Rules', icon: 'lucide:shield-check',
    title: 'Validation rules', hint: 'Required fields, formats and allowed values.', data: validationRules.value,
  }] : []),
  ...(relations.value.length ? [{
    value: 'relations', label: 'Relations', icon: 'lucide:git-branch',
    title: 'Related collections', hint: 'Relation types, targets and nullability.', data: relations.value,
  }] : []),
]);
const tabs = computed(() => sections.value.map(({ value, label, icon }) => ({ value, label, icon })));
const activeSection = computed(() => sections.value.find(section => section.value === activeTab.value) || sections.value[0]!);
const activeJson = computed(() => JSON.stringify(activeSection.value.data, null, 2));

watch(tabs, items => {
  if (!items.some(item => item.value === activeTab.value)) activeTab.value = 'structure';
});
watch(() => props.tableName, () => { activeTab.value = 'structure'; });
</script>

<style scoped>
.schema-json :deep(.vjs-value) {
  white-space: pre;
  word-break: normal;
}

.schema-json :deep(.vjs-tree-node) {
  min-height: 24px;
}

.schema-json :deep(.vjs-tree-node:hover) {
  background: transparent;
}

@media (hover: hover) and (pointer: fine) {
  .schema-json :deep(.vjs-tree-node:hover) {
    background: var(--surface-nested);
  }
}
</style>
