import type { RelationId } from '~/types/relation';

export function getRelationId(
  value: unknown,
  getId: (record: Record<string, unknown>) => unknown,
): RelationId | null {
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (!value || typeof value !== 'object') return null;

  const id = getId(value as Record<string, unknown>);
  return typeof id === 'string' || typeof id === 'number' ? id : null;
}
