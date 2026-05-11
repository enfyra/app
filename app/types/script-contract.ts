export type ScriptLanguage = 'javascript' | 'typescript';

export interface ScriptContractFields {
  sourceCode?: string | null;
  scriptLanguage?: ScriptLanguage | string | null;
  compiledCode?: string | null;
  [key: string]: any;
}
