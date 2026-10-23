export type ScriptLanguage = 'javascript' | 'typescript';

export interface ScriptContractFields {
  sourceCode?: string | null;
  scriptLanguage?: ScriptLanguage | string | null;
  compiledCode?: string | null;
}

export interface NormalizedScriptContractFields {
  sourceCode: string | null;
  scriptLanguage: ScriptLanguage;
  compiledCode: string | null;
}

export type NormalizedScriptContract<T extends ScriptContractFields> =
  Omit<T, keyof NormalizedScriptContractFields> & NormalizedScriptContractFields;
