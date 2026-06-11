import { describe, expect, it } from 'vitest';

import {
  filterMethodsByAllowedMethodNames,
  getSelectedMethodIdentities,
} from '../../app/utils/form/method-selector';

const getId = (method: Record<string, any>) => method.id;

describe('method selector helpers', () => {
  it('selects methods by method name when relation records have no id', () => {
    const selected = getSelectedMethodIdentities([{ name: 'GET' }, { name: 'POST' }], true, getId);

    expect(selected.has('GET')).toBe(true);
    expect(selected.has('POST')).toBe(true);
  });

  it('keeps selected route methods with no id when allowed by name', () => {
    const filtered = filterMethodsByAllowedMethodNames(
      [{ name: 'GET' }, { name: 'POST' }],
      ['GET', 'POST', 'PATCH'],
    );

    expect(filtered).toEqual([{ name: 'GET' }, { name: 'POST' }]);
  });

  it('filters selected route methods by allowed method name', () => {
    const filtered = filterMethodsByAllowedMethodNames(
      [{ name: 'GET' }, { name: 'DELETE' }],
      ['GET'],
    );

    expect(filtered).toEqual([{ name: 'GET' }]);
  });
});
