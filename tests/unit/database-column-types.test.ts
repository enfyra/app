import { columnTypes, mongoColumnTypes } from '~/types/database';

describe('database column type pickers', () => {
  it('keeps SQL-native and Enfyra semantic types out of the Mongo picker', () => {
    const values = mongoColumnTypes.map((type) => type.value);

    expect(values).toContain('objectId');
    expect(values).toContain('object');
    expect(values).toContain('json');
    expect(values).toContain('code');
    expect(values).not.toContain('ObjectId');
    expect(values).not.toContain('varchar');
    expect(values).not.toContain('simple-json');
    expect(values).not.toContain('longtext');
  });

  it('keeps Mongo-native primitives out of the SQL picker', () => {
    const values = columnTypes.map((type) => type.value);

    expect(values).toContain('text');
    expect(values).toContain('longtext');
    expect(values).toContain('code');
    expect(values).not.toContain('ObjectId');
    expect(values).not.toContain('objectId');
    expect(values).not.toContain('object');
  });
});
