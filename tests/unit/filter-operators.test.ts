import { mapDbTypeToFilterType } from '~/utils/common/filter/filter-operators';

describe('filter type mapping', () => {
  it('maps SQL and Mongo numeric types to numeric operators', () => {
    for (const type of ['int', 'bigint', 'long', 'float', 'double', 'decimal']) {
      expect(mapDbTypeToFilterType(type)).toBe('number');
    }
  });

  it('maps SQL and Mongo boolean types to boolean operators', () => {
    expect(mapDbTypeToFilterType('boolean')).toBe('boolean');
    expect(mapDbTypeToFilterType('bool')).toBe('boolean');
  });

  it('keeps native Mongo string and ObjectId fields on scalar string operators', () => {
    expect(mapDbTypeToFilterType('string')).toBe('string');
    expect(mapDbTypeToFilterType('objectId')).toBe('string');
  });
});
