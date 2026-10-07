import { describe, expect, it } from 'vitest';
import { defaultPageId, isDefaultPageCandidate, resolveDefaultPage, isDefaultPageAncestor } from '../../app/utils/default-page';

describe('Default page navigation', () => {
  const menu = { id: 7, path: '/home', type: 'Menu', isEnabled: true };
  it('resolves current paths from SQL and Mongo references', () => {
    expect(defaultPageId({ _id: 'abc' })).toBe('abc');
    expect(resolveDefaultPage({ id: 7 }, [menu], () => true)).toBe('/home');
    expect(resolveDefaultPage({ _id: 'abc' }, [{ ...menu, id: undefined, _id: 'abc' }], () => true)).toBe('/home');
  });
  it.each(['/items/:id', '/', '/login', '//other.example', '/a?b', '/a#b', '/[id]', '/a b'])('rejects %s', path => {
    expect(isDefaultPageCandidate({ ...menu, path })).toBe(false);
  });
  it('does not redirect to missing, disabled or inaccessible menus', () => {
    expect(resolveDefaultPage(null, [menu], () => true)).toBeNull();
    expect(resolveDefaultPage(9, [menu], () => true)).toBeNull();
    expect(resolveDefaultPage(7, [menu], () => false)).toBeNull();
    expect(resolveDefaultPage(7, [{ ...menu, isEnabled: false }], () => true)).toBeNull();
  });
  it('protects ancestors without looping on malformed trees', () => {
    const menus = [{ ...menu, parent: { id: 3 } }, { id: 3, parent: { id: 3 } }];
    expect(isDefaultPageAncestor(3, 7, menus)).toBe(true);
    expect(isDefaultPageAncestor(8, 7, menus)).toBe(false);
  });
});
