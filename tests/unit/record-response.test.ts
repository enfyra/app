import { describe, expect, it } from 'vitest';
import { extractCreatedRecord } from '../../app/utils/api/record-response';

describe('extractCreatedRecord', () => {
  it('extracts the first record from collection create responses', () => {
    expect(extractCreatedRecord({ data: [{ id: 7 }] })).toEqual({ id: 7 });
  });

  it('extracts a direct data object response', () => {
    expect(extractCreatedRecord({ data: { id: 8 } })).toEqual({ id: 8 });
  });

  it('extracts nested proxy response data', () => {
    expect(extractCreatedRecord({ data: { data: [{ id: 9 }] } })).toEqual({
      id: 9,
    });
  });

  it('returns null for empty responses', () => {
    expect(extractCreatedRecord(null)).toBeNull();
    expect(extractCreatedRecord({ data: [] })).toBeNull();
  });
});
