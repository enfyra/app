import type {
  NormalizedScriptContract,
  ScriptContractFields,
  ScriptLanguage,
} from '~/types/script-contract';

export function normalizeScriptLanguage(value: unknown): ScriptLanguage {
  return value === 'javascript' ? 'javascript' : 'typescript';
}

export function normalizeScriptContract<T extends ScriptContractFields>(
  record: T,
): NormalizedScriptContract<T> {
  return {
    ...record,
    sourceCode:
      record.sourceCode === undefined || record.sourceCode === ''
        ? null
        : record.sourceCode,
    scriptLanguage: normalizeScriptLanguage(record.scriptLanguage),
    compiledCode: record.compiledCode ?? null,
  };
}
