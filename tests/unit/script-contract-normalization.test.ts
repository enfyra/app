import { describe, expect, it } from 'vitest';
import { normalizeScriptContract } from '~/utils/script-contract';

describe('script contract normalization', () => {
  it('normalizes empty script fields without dropping domain metadata', () => {
    expect(normalizeScriptContract({ sourceCode: '', scriptLanguage: 'legacy', key: 'step', params: [false, null] })).toEqual({
      sourceCode: null,
      compiledCode: null,
      scriptLanguage: 'typescript',
      key: 'step',
      params: [false, null],
    });
  });

  it('preserves JavaScript source and compiled output', () => {
    expect(normalizeScriptContract({ sourceCode: 'return false;', scriptLanguage: 'javascript', compiledCode: 'return false;' })).toEqual({
      sourceCode: 'return false;',
      scriptLanguage: 'javascript',
      compiledCode: 'return false;',
    });
  });
});
