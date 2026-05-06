import type {
  ScriptContractFields,
  ScriptLanguage,
} from '~/types/script-contract';

export function normalizeScriptLanguage(value: unknown): ScriptLanguage {
  return value === 'javascript' ? 'javascript' : 'typescript';
}

export function normalizeScriptContract<T extends ScriptContractFields>(
  record: T,
): T & {
  sourceCode: string | null;
  scriptLanguage: ScriptLanguage;
  compiledCode: string | null;
} {
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

export function clearCompiledCodeOnScriptChange<T extends ScriptContractFields>(
  record: T,
): T {
  return {
    ...record,
    compiledCode: null,
  };
}

export function stripLegacyScriptFields<T extends Record<string, any>>(
  config: T | null | undefined,
): Record<string, any> {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return {};
  const cleaned = { ...config };
  delete cleaned.sourceCode;
  delete cleaned.scriptLanguage;
  delete cleaned.compiledCode;
  delete cleaned.code;
  return cleaned;
}

export function getScriptSource(
  record: ScriptContractFields | null | undefined,
  fallbackConfig?: Record<string, any> | null,
): string | null {
  return (
    record?.sourceCode ??
    fallbackConfig?.sourceCode ??
    fallbackConfig?.code ??
    null
  );
}
