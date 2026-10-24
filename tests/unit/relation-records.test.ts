import { getRelationId } from '~/utils/relation-records';

const getId = (record: Record<string, unknown>) => record.id as string | number | undefined;

describe('relation record helpers', () => {
  it('normalizes legacy record values to their primary key without changing scalar ids', () => {
    expect(getRelationId({ id: 'article-1', title: 'How relations work' }, getId)).toBe('article-1');
    expect(getRelationId('507f1f77bcf86cd799439011', getId)).toBe('507f1f77bcf86cd799439011');
    expect(getRelationId(42, getId)).toBe(42);
    expect(getRelationId(0, getId)).toBe(0);
    expect(getRelationId({ _id: 'mongo-user' }, record => record._id)).toBe('mongo-user');
  });

  it('never turns nested objects or unsupported values into relation ids', () => {
    expect(getRelationId({ id: { nested: true } }, record => record.id)).toBeNull();
    expect(getRelationId(false, getId)).toBeNull();
    expect(getRelationId(null, getId)).toBeNull();
  });
});
