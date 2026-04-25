import {
  ENFYRA_CACHE_COMPLETIONS,
  ENFYRA_COMPLETIONS,
  ENFYRA_CTX_COMPLETIONS,
  ENFYRA_FLOW_COMPLETIONS,
  ENFYRA_HELPER_COMPLETIONS,
  ENFYRA_METHOD_COMPLETIONS,
  ENFYRA_SOCKET_COMPLETIONS,
  ENFYRA_THROW_COMPLETIONS,
  VUE_COMPLETIONS,
  VUE_COMPONENT_COMPLETIONS,
} from '~/utils/editor-completions.constants';
import { lintEnfyraTypeScript } from '~/utils/editor/enfyraTypeScriptLinter';

export function useCodeMirrorExtensions(codeMirrorModules?: Ref<any> | any) {
  type CodeLanguage = "javascript" | "vue" | "json" | "html" | "typescript";

  const ENFYRA_MACROS = new Set(ENFYRA_COMPLETIONS.map((item) => item.label));

  const modules = computed(() => {
    if (!codeMirrorModules) return null
    return isRef(codeMirrorModules) ? codeMirrorModules.value : codeMirrorModules
  })

  const getModules = () => modules.value
  function collectEnfyraRanges(text: string): Array<{ from: number; to: number; kind: 'macro' | 'repo' | 'package' | 'standaloneAt' }> {
    const ranges: Array<{ from: number; to: number; kind: 'macro' | 'repo' | 'package' | 'standaloneAt' }> = []
    const len = text.length
    const CODE = 0
    const STRING_DOUBLE = 1
    const STRING_SINGLE = 2
    const TEMPLATE = 3
    const COMMENT_LINE = 4
    const COMMENT_BLOCK = 5
    let state = CODE
    let pos = 0
    let templateExprDepth = 0
    let braceDepth = 0

    const isUpperMacroChar = (char: string) => /[A-Z0-9_]/.test(char)
    const isIdentifierStart = (char: string) => /[A-Za-z_]/.test(char)
    const isIdentifierChar = (char: string) => /[A-Za-z0-9_]/.test(char)

    while (pos < len) {
      const char = text[pos]
      const next = text[pos + 1]

      if (state === CODE) {
        if (char === '"') {
          state = STRING_DOUBLE
          pos++
        } else if (char === "'") {
          state = STRING_SINGLE
          pos++
        } else if (char === '`') {
          state = TEMPLATE
          pos++
        } else if (char === '/' && next === '/') {
          state = COMMENT_LINE
          pos += 2
        } else if (char === '/' && next === '*') {
          state = COMMENT_BLOCK
          pos += 2
        } else if (char === '@') {
          const start = pos
          pos++
          while (pos < len && isUpperMacroChar(text[pos])) pos++
          const token = text.slice(start, pos)
          if (ENFYRA_MACROS.has(token)) {
            ranges.push({ from: start, to: pos, kind: 'macro' })
          } else if (token === '@') {
            ranges.push({ from: start, to: pos, kind: 'standaloneAt' })
          }
        } else if (char === '#' || char === '%') {
          const start = pos
          const kind = char === '#' ? 'repo' : 'package'
          pos++
          if (pos < len && isIdentifierStart(text[pos])) {
            pos++
            while (pos < len && isIdentifierChar(text[pos])) pos++
            ranges.push({ from: start, to: pos, kind })
          }
        } else if (char === '{') {
          if (templateExprDepth > 0) braceDepth++
          pos++
        } else if (char === '}' && templateExprDepth > 0) {
          if (braceDepth > 0) {
            braceDepth--
          } else {
            templateExprDepth--
            state = TEMPLATE
          }
          pos++
        } else {
          pos++
        }
      } else if (state === STRING_DOUBLE) {
        if (char === '\\') {
          pos += 2
        } else if (char === '"') {
          state = CODE
          pos++
        } else {
          pos++
        }
      } else if (state === STRING_SINGLE) {
        if (char === '\\') {
          pos += 2
        } else if (char === "'") {
          state = CODE
          pos++
        } else {
          pos++
        }
      } else if (state === TEMPLATE) {
        if (char === '\\') {
          pos += 2
        } else if (char === '`') {
          state = CODE
          pos++
        } else if (char === '$' && next === '{') {
          pos += 2
          templateExprDepth++
          state = CODE
        } else {
          pos++
        }
      } else if (state === COMMENT_LINE) {
        if (char === '\n') state = CODE
        pos++
      } else if (state === COMMENT_BLOCK) {
        if (char === '*' && next === '/') {
          pos += 2
          state = CODE
        } else {
          pos++
        }
      }
    }

    return ranges
  }

  function buildEnfyraDecorations(view: any): any {
    const m = getModules()
    if (!m) return null
    const builder = new m.RangeSetBuilder()
    const text = view.state.doc.toString()

    const templateDecoration = m.Decoration.mark({
      tagName: "span",
      class: "cm-enfyra-template",
      attributes: {
        style: "color: #4EC9B0 !important; font-weight: bold !important; background: transparent !important;"
      }
    })

    const throwDecoration = m.Decoration.mark({
      tagName: "span",
      class: "cm-enfyra-throw",
      attributes: {
        style: "color: #F48771 !important; font-weight: bold !important; background: transparent !important;"
      }
    })

    const tableAccessDecoration = m.Decoration.mark({
      tagName: "span",
      class: "cm-enfyra-table",
      attributes: {
        style: "color: #DCDCAA !important; font-weight: bold !important; background: transparent !important;"
      }
    })

    const percentageDecoration = m.Decoration.mark({
      tagName: "span",
      class: "cm-enfyra-percentage",
      attributes: {
        style: "color: #C586C0 !important; font-weight: bold !important; background: transparent !important;"
      }
    })

    const standaloneAtDecoration = m.Decoration.mark({
      tagName: "span",
      class: "cm-enfyra-standalone-at",
      attributes: {
        style: "color: inherit !important; background: transparent !important; position: relative; z-index: 10;"
      }
    })

    const allDecorations: Array<{ from: number; to: number; decoration: any }> = []

    for (const range of collectEnfyraRanges(text)) {
      const decoration = range.kind === 'repo'
        ? tableAccessDecoration
        : range.kind === 'package'
          ? percentageDecoration
          : range.kind === 'standaloneAt'
            ? standaloneAtDecoration
            : range.from >= 0 && text.slice(range.from, range.to).startsWith('@THROW')
              ? throwDecoration
              : templateDecoration
      allDecorations.push({ from: range.from, to: range.to, decoration })
    }

    allDecorations.sort((a, b) => a.from - b.from)

    for (const dec of allDecorations) {
      builder.add(dec.from, dec.to, dec.decoration)
    }

    return builder.finish()
  }

  const enfyraSyntaxPlugin = computed(() => {
    const m = getModules()
    if (!m?.ViewPlugin) return null
    return m.ViewPlugin.fromClass(class {
      decorations: any

      constructor(view: any) {
        this.decorations = buildEnfyraDecorations(view) || m.Decoration.none
      }

      update(update: any) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildEnfyraDecorations(update.view) || m.Decoration.none
        }
      }
    }, {
      decorations: (plugin: any) => plugin.decorations
    })
  })

  const vueIndentService = computed(() => {
    const m = getModules()
    if (!m) return null
    return m.indentService.of((context: any, pos: number) => {
    const doc = context.state.doc;
    
    let checkPos = pos - 1;
    let prevLineText = '';
    let actualPrevLine = null;
    
    while (checkPos > 0) {
      const lineAtPos = doc.lineAt(checkPos);
      const lineText = lineAtPos.text.trim();
      
      if (lineText !== '') {
        prevLineText = lineAtPos.text;
        actualPrevLine = lineAtPos;
        break;
      }
      checkPos = lineAtPos.from - 1;
    }
    
    if (prevLineText.trim().match(/^<script[^>]*>$/)) {
      return 0; 
    }
    
    const trimmedPrev = prevLineText.trim();
    const rootLevelPatterns = [
      /^(import|export|const|let|var|function|class)\b/,
      /^\/\//,
      /^\/\*/,  
    ];
    
    const isRootLevel = rootLevelPatterns.some(pattern => pattern.test(trimmedPrev)) 
                       && !trimmedPrev.includes('{') 
                       && !trimmedPrev.endsWith('{')
                       && !trimmedPrev.includes('(');
    
    if (isRootLevel) {
      return 0; 
    }
    
    const baseIndent = /^\s*/.exec(prevLineText)?.[0]?.length || 0;
    
    const trimmed = prevLineText.trim();
    const shouldIndent = trimmed.endsWith('{') || 
                         trimmed.endsWith('(') ||
                         /\b(if|for|while|function)\s*\([^)]*\)\s*{$/.test(trimmed) ||
                         /^function\s+\w+\s*\([^)]*\)\s*{/.test(trimmed);
    
    if (shouldIndent) {
      return baseIndent + 2; 
    }
    
      return baseIndent; 
    })
  })

  function getLanguageExtension(language?: CodeLanguage) {
    const m = getModules()
    if (!m) return null
    switch (language) {
      case "vue":
        return m.vue();
      case "html":
        return m.html();
      case "typescript":
        return m.javascript({ jsx: true, typescript: true });
      case "javascript":
      default:
        return m.javascript({ jsx: true, typescript: false });
    }
  }

  const createLinter = (language?: CodeLanguage, onDiagnostics?: (diags: any[]) => void) => {
    const m = getModules()
    if (!m) return () => []
    return m.linter(async (view: any) => {
      let diagnostics: any[] = [];

      if (language === 'typescript') {
        diagnostics = await lintEnfyraTypeScript(view.state.doc.toString());
      }
      
      if (onDiagnostics) {
        onDiagnostics(diagnostics);
      }
      
      return diagnostics;
    }, { delay: 350 });
  };

  function enfyraCompletionSource(m: any) {
    return (context: any) => {
      const ctxMember = context.matchBefore(/\$ctx\.[\w$]*/);
      if (ctxMember) {
        return { from: ctxMember.from + '$ctx.'.length, options: ENFYRA_CTX_COMPLETIONS.filter((item) => item.label !== '$ctx') };
      }

      const ctxRoot = context.matchBefore(/\$[\w$]*/);
      if (ctxRoot) {
        return { from: ctxRoot.from, options: ENFYRA_CTX_COMPLETIONS.filter((item) => item.label === '$ctx') };
      }

      const member = context.matchBefore(/(?:\$ctx\.\$helpers|\$ctx\.\$cache|\$ctx\.\$socket|\$ctx\.\$throw|\$ctx\.\$flow|\$ctx\.\$repos(?:\.[A-Za-z_$][\w$]*)?|@HELPERS|@CACHE|@SOCKET|@THROW|@FLOW|@REPOS(?:\.[A-Za-z_$][\w$]*)?|#[A-Za-z_][\w]*|%[A-Za-z_][\w]*)\.[\w$]*/);
      if (member) {
        const text = member.text;
        const lastDot = text.lastIndexOf('.');
        const target = text.slice(0, lastDot);
        const from = member.from + lastDot + 1;
        if (target === '$ctx.$helpers' || target === '@HELPERS') return { from, options: ENFYRA_HELPER_COMPLETIONS };
        if (target === '$ctx.$cache' || target === '@CACHE') return { from, options: ENFYRA_CACHE_COMPLETIONS };
        if (target === '$ctx.$socket' || target === '@SOCKET') return { from, options: ENFYRA_SOCKET_COMPLETIONS };
        if (target === '$ctx.$throw' || target === '@THROW') return { from, options: ENFYRA_THROW_COMPLETIONS };
        if (target === '$ctx.$flow' || target === '@FLOW') return { from, options: ENFYRA_FLOW_COMPLETIONS };
        if (target.startsWith('#') || target.startsWith('%') || /^(@REPOS|\$ctx\.\$repos)\.[A-Za-z_$][\w$]*$/.test(target)) {
          return { from, options: ENFYRA_METHOD_COMPLETIONS };
        }
      }

      const macro = context.matchBefore(/@[\w]*/);
      if (macro) return { from: macro.from, options: ENFYRA_COMPLETIONS };

      const repo = context.matchBefore(/#[\w]*/);
      if (repo) return { from: repo.from, options: [{ label: '#table_name', type: 'variable', detail: '$ctx.$repos.table_name' }] };

      const pkg = context.matchBefore(/%[\w]*/);
      if (pkg) return { from: pkg.from, options: [{ label: '%package_name', type: 'variable', detail: '$ctx.$pkgs.package_name' }] };

      return null;
    };
  }

  function vueCompletionSource(m: any) {
    return (context: any) => {
      const word = context.matchBefore(/[\w]*/);
      if (!word || word.from === word.to) return null;
      return { from: word.from, options: [...VUE_COMPLETIONS, ...VUE_COMPONENT_COMPLETIONS] };
    };
  }

  const getBasicSetup = (language?: CodeLanguage, onDiagnostics?: (diags: any[]) => void, enfyraAutocomplete?: boolean | 'vue', lintEnabled = true) => {
    const m = getModules()
    if (!m) return []
    
    const setup = [
      m.lineNumbers(),
      m.highlightActiveLine(),
      m.history(),
      m.foldGutter(),
      m.drawSelection(),
      m.dropCursor(),
      m.rectangularSelection(),
      m.crosshairCursor(),
      m.bracketMatching(),
      m.closeBrackets(),
      m.autocompletion({
        override: enfyraAutocomplete === 'vue'
          ? [vueCompletionSource(m)]
          : enfyraAutocomplete
            ? [enfyraCompletionSource(m)]
            : undefined,
      }),
      m.highlightSelectionMatches(),
      m.indentUnit.of("  "),
      createLinter(lintEnabled ? language : undefined, onDiagnostics),
      m.lintGutter(),
      m.keymap.of([
        {
          key: "Enter",
          run: (view: any) => {
            const state = view.state;
            const pos = state.selection.main.head;
            const before = state.doc.sliceString(pos - 1, pos);
            const after = state.doc.sliceString(pos, pos + 1);

            const pairs = [
              { open: '{', close: '}' },
              { open: '[', close: ']' },
              { open: '(', close: ')' },
            ];

            for (const pair of pairs) {
              if (before === pair.open && after === pair.close) {
                const line = state.doc.lineAt(pos);
                const currentIndent = /^\s*/.exec(line.text)?.[0] || '';
                const indent = currentIndent + '  '; 

                view.dispatch({
                  changes: {
                    from: pos,
                    to: pos,
                    insert: '\n' + indent + '\n' + currentIndent
                  },
                  selection: { anchor: pos + 1 + indent.length }
                });
                return true;
              }
            }

            return m.insertNewlineAndIndent(view);
          },
        },
        {
          key: "Backspace",
          run: (view: any) => {
            const state = view.state;
            const pos = state.selection.main.head;
            const line = state.doc.lineAt(pos);

            if (line.text.trim() === '' && line.text.length > 0 && pos === line.to && line.number > 1) {
              const prevLine = state.doc.line(line.number - 1);
              const nextLine = line.number < state.doc.lines ? state.doc.line(line.number + 1) : null;

              if (prevLine && nextLine) {
                const prevTrimmed = prevLine.text.trim();
                const nextTrimmed = nextLine.text.trim();

                if ((prevTrimmed.endsWith('{') && nextTrimmed === '}') ||
                    (prevTrimmed.endsWith('[') && nextTrimmed === ']') ||
                    (prevTrimmed.endsWith('(') && nextTrimmed === ')')) {
                  view.dispatch({
                    changes: { from: prevLine.to, to: nextLine.from, insert: '' }
                  });
                  return true;
                }
              }
            }
            return false;
          },
        },
        m.indentWithTab,
        ...m.closeBracketsKeymap,
        ...m.defaultKeymap,
        ...m.historyKeymap,
        ...m.foldKeymap,
        ...m.completionKeymap,
        ...m.searchKeymap,
      ]),
    ];
    
    if (language === 'vue') {
      const indent = vueIndentService.value
      if (indent) setup.push(indent);
    } else if (language === 'javascript' || language === 'typescript' || language === 'html' || language === 'json') {
      setup.push(m.indentOnInput());
    }
    
    return setup;
  };

  return {
    getLanguageExtension,
    getBasicSetup,
    enfyraSyntaxPlugin,
    basicSetup: getBasicSetup("javascript"),
  };
}
