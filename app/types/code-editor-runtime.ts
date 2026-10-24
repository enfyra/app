import type { Diagnostic } from '@codemirror/lint';
import type { Ref } from 'vue';

export type CodeMirrorModules =
  Pick<typeof import('@codemirror/view'), 'EditorView' | 'lineNumbers' | 'highlightActiveLine' | 'keymap' | 'ViewPlugin' | 'drawSelection' | 'dropCursor' | 'rectangularSelection' | 'crosshairCursor' | 'Decoration'> &
  Pick<typeof import('@codemirror/state'), 'EditorState' | 'StateEffect' | 'StateField' | 'Compartment' | 'RangeSetBuilder'> &
  Pick<typeof import('@codemirror/commands'), 'indentWithTab' | 'history' | 'defaultKeymap' | 'historyKeymap' | 'insertNewlineAndIndent'> &
  Pick<typeof import('@codemirror/autocomplete'), 'closeBrackets' | 'closeBracketsKeymap' | 'autocompletion' | 'completionKeymap' | 'CompletionContext' | 'completeFromList'> &
  Pick<typeof import('@codemirror/language'), 'bracketMatching' | 'indentUnit' | 'foldGutter' | 'foldKeymap' | 'indentOnInput' | 'indentService' | 'forceParsing' | 'HighlightStyle' | 'defaultHighlightStyle' | 'syntaxHighlighting'> &
  Pick<typeof import('@lezer/highlight'), 'tags'> &
  Pick<typeof import('@codemirror/lint'), 'linter' | 'lintGutter'> &
  Pick<typeof import('@codemirror/search'), 'searchKeymap' | 'highlightSelectionMatches'> &
  Pick<typeof import('@codemirror/lang-javascript'), 'javascript'> &
  Pick<typeof import('@codemirror/lang-vue'), 'vue'> &
  Pick<typeof import('@codemirror/lang-html'), 'html'> &
  Pick<typeof import('@uiw/codemirror-theme-vscode'), 'vscodeDark' | 'vscodeLight'>;

export type CodeMirrorModuleSource<T = CodeMirrorModules> = T | Readonly<Ref<T | null>> | null;

export interface CodeMirrorEditorOptions {
  modelValue?: string | Readonly<Ref<string | undefined>>;
  emit: {
    (event: 'update:modelValue', value: string): void;
    (event: 'diagnostics', diagnostics: Diagnostic[]): void;
  };
  codeMirrorModules?: CodeMirrorModuleSource<Pick<CodeMirrorModules, 'EditorView' | 'StateEffect'>>;
}
