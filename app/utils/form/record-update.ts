import { isEqual } from 'lodash-es';
import type { TableDefinitionField } from '~/types/database';

export function buildRecordEditQuery(definition: readonly TableDefinitionField[], idField: string) {
  const relations = definition.filter(field => field.fieldType === 'relation' && field.metadataAccess?.read !== false);
  return {
    fields: ['*', ...relations.map(field => `${field.propertyName}.${idField}`)].join(','),
    deep: Object.fromEntries(relations
      .filter(field => field.type === 'one-to-many' || field.type === 'many-to-many')
      .map(field => [field.propertyName, { limit: 0 }])),
  };
}

export function changedRecordFields(original: Record<string, unknown>, current: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(current).filter(([key, value]) =>
    key !== 'id' && key !== '_id' && value !== undefined && !isEqual(original[key], value),
  ));
}
