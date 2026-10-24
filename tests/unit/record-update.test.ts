import { describe, expect, it } from 'vitest';
import { buildRecordEditQuery, changedRecordFields } from '~/utils/form/record-update';
describe('record edit projection and write intent', () => {
  it.each(['id', '_id'])('loads complete direct relation identities with %s', idField => {
    const query = buildRecordEditQuery([
      { propertyName: 'tags', fieldType: 'relation', type: 'many-to-many' },
      { propertyName: 'private', fieldType: 'relation', type: 'one-to-many', metadataAccess: { read: false } },
    ] as any, idField);
    expect(query.fields).toContain(`tags.${idField}`);
    expect(query.deep).toEqual({ tags: { limit: 0 } });
  });
  it('omits unchanged slices, primary keys and undefined, preserving false/null/empty edits', () => {
    const tags = Array.from({ length: 11 }, (_, id) => ({ id }));
    expect(changedRecordFields({ title: 'before', tags, count: 1, enabled: true, json: { a: 1, b: 2 } }, {
      id: 1, title: null, tags: tags.map(tag => ({ ...tag })), count: 0, enabled: false, omitted: undefined, empty: '', json: { b: 2, a: 1 },
    })).toEqual({ title: null, count: 0, enabled: false, empty: '' });
    expect(changedRecordFields({ tags }, { tags: [] })).toEqual({ tags: [] });
  });
});
