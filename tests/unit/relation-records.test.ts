import type { TableDefinitionField } from '~/types/database';
import { buildRelationSearchFilter, getRelationId } from '~/utils/relation-records';

const getId = (record: Record<string, unknown>) => record.id as string | number | undefined;

describe('relation record helpers', () => {
  it('normalizes legacy record values to their primary key without changing scalar ids', () => {
    expect(getRelationId({ id: 'article-1', title: 'How relations work' }, getId)).toBe('article-1');
    expect(getRelationId('507f1f77bcf86cd799439011', getId)).toBe('507f1f77bcf86cd799439011');
    expect(getRelationId(42, getId)).toBe(42);
  });

  it('builds a safe text search filter from readable text metadata and exact primary-key matching', () => {
    const definition: TableDefinitionField[] = [
      { fieldType: 'column', name: 'title', type: 'varchar' },
      { fieldType: 'column', name: 'body', type: 'text' },
      { fieldType: 'column', name: 'privateNote', type: 'text', metadataAccess: { read: false } },
      { fieldType: 'column', name: 'publishedAt', type: 'datetime' },
    ];

    expect(buildRelationSearchFilter('directus', definition, 'id')).toEqual({
      _or: [
        { id: { _eq: 'directus' } },
        { title: { _contains: 'directus' } },
        { body: { _contains: 'directus' } },
      ],
    });
  });
});
