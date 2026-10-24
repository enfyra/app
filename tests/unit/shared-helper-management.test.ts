import { describe, expect, it } from 'vitest';
import { buildHelperInvocation, buildHelperTestScript, normalizeSharedHelperForm, validateSharedHelperForm } from '../../app/utils/form/shared-helper';

describe('shared helper authoring', () => {
  it('keeps only writable source fields without changing source bytes', () => {
    expect(normalizeSharedHelperForm({ name: 'search', sourceCode: ' return @PARAMS;\n', compiledCode: 'stale', id: 1 })).toEqual({ name: 'search', description: '', isEnabled: true, scriptLanguage: 'typescript', sourceCode: ' return @PARAMS;\n' });
  });
  it.each(['BadName', '__proto__', 'run', 'a b', ''])('rejects invalid names: %s', name => {
    expect(validateSharedHelperForm({ ...normalizeSharedHelperForm({}), name }).name).toBeTruthy();
  });
  it('allows the selected digit-first name and disabled empty drafts', () => {
    expect(validateSharedHelperForm(normalizeSharedHelperForm({ name: '1endpoint_web_search', isEnabled: false }))).toEqual({});
    expect(validateSharedHelperForm(normalizeSharedHelperForm({ name: 'empty', isEnabled: true })).sourceCode).toBeTruthy();
  });
  it('builds a copyable invocation and safe draft test wrapper', () => {
    expect(buildHelperInvocation('search')).toBe("const result = await @HELPERS.run('search', {\n  query: 'Search terms',\n});");
    const script = buildHelperTestScript('return @PARAMS.query;');
    expect(script).toContain('async function($ctx)');
    expect(script).toContain('return @PARAMS.query;');
    expect(script).toContain('$params: @BODY.params');
    expect(script).toContain('$body: {}, $query: {}, $share: {}, $user: null');
    expect(script).not.toContain('function(input)');
  });
});
