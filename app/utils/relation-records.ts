import type { TableDefinitionField } from '~/types/database';
import type { RelationId } from '~/types/relation';

const SEARCHABLE_COLUMN_TYPES = new Set([
  'varchar',
  'text',
  'enum',
  'richtext',
  'code',
  'uuid',
  'ObjectId',
]);

export function getRelationId(
  value: unknown,
  getId: (record: Record<string, unknown>) => unknown,
): RelationId | null {
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (!value || typeof value !== 'object') return null;

  const id = getId(value as Record<string, unknown>);
  return typeof id === 'string' || typeof id === 'number' ? id : null;
}

export function buildRelationSearchFilter(
  query: string,
  definition: TableDefinitionField[],
  idField: string,
): Record<string, unknown> | null {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return null;

  const readableTextFields = definition
    .filter((field) => (
      field.fieldType === 'column'
      && !!field.name
      && field.metadataAccess?.read !== false
      && SEARCHABLE_COLUMN_TYPES.has(field.type ?? '')
    ))
    .map((field) => field.name as string);

  const searchableFields = [...new Set([idField, ...readableTextFields])];
  return {
    _or: searchableFields.map((field) => ({
      [field]: field === idField
        ? { _eq: normalizedQuery }
        : { _contains: normalizedQuery },
    })),
  };
}
