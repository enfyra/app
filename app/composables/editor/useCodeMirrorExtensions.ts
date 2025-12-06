export function useCodeMirrorExtensions(codeMirrorModules?: Ref<any> | any) {
  // Get modules (handle both ref and direct value)
  const modules = computed(() => {
    if (!codeMirrorModules) return null
    return isRef(codeMirrorModules) ? codeMirrorModules.value : codeMirrorModules
  })
  
  // Helper to get modules value - always check current state
  const getModules = () => modules.value
  function isInComment(doc: any, absolutePos: number): boolean {
    const fullText = doc.toString()
    const beforePos = fullText.substring(0, absolutePos)
    
    const lineCommentIndex = beforePos.lastIndexOf('//')
    if (lineCommentIndex !== -1) {
      const afterComment = fullText.substring(lineCommentIndex + 2, absolutePos)
      if (!afterComment.includes('\n')) {
        return true
      }
    }
    
    const blockCommentStart = beforePos.lastIndexOf('/*')
    if (blockCommentStart !== -1) {
      const afterStart = fullText.substring(blockCommentStart + 2)
      const blockCommentEnd = afterStart.indexOf('*/')
      if (blockCommentEnd === -1 || blockCommentStart + 2 + blockCommentEnd >= absolutePos) {
        return true
      }
    }
    
    return false
  }

  function buildEnfyraDecorations(view: any): any {
    const m = getModules()
    if (!m) return null
    const builder = new m.RangeSetBuilder()
    const doc = view.state.doc

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

    for (let i = 1; i <= doc.lines; i++) {
      const line = doc.line(i)
      const text = line.text

      const templateRegex = /@(CACHE|REPOS|HELPERS|LOGS|ERRORS|BODY|DATA|STATUS|PARAMS|QUERY|USER|REQ|RES|SHARE|API|UPLOADED_FILE|PKGS)\b/g
      const templateWithBracketRegex = /@(CACHE|REPOS|HELPERS|LOGS|ERRORS|BODY|DATA|STATUS|PARAMS|QUERY|USER|REQ|RES|SHARE|API|UPLOADED_FILE|PKGS)\s*\[(['"])([^'"]*)\1\]/g
      const throwRegex = /@THROW\d*/g
      
      const matchedRanges: Array<{ from: number; to: number }> = []
      let match
      
      // First, match template syntax with bracket access (e.g., @PKGS['abc'])
      while ((match = templateWithBracketRegex.exec(text)) !== null) {
        const absolutePos = line.from + match.index
        if (!isInComment(doc, absolutePos)) {
          const fullMatch = match[0]
          builder.add(absolutePos, absolutePos + fullMatch.length, templateDecoration)
          matchedRanges.push({ from: absolutePos, to: absolutePos + fullMatch.length })
        }
      }
      
      // Then, match template syntax without bracket access
      while ((match = templateRegex.exec(text)) !== null) {
        const absolutePos = line.from + match.index
        if (!isInComment(doc, absolutePos)) {
          // Check if this match is already covered by bracket regex
          const isAlreadyMatched = matchedRanges.some(range => 
            absolutePos >= range.from && absolutePos < range.to
          )
          if (!isAlreadyMatched) {
            builder.add(absolutePos, absolutePos + match[0].length, templateDecoration)
            matchedRanges.push({ from: absolutePos, to: absolutePos + match[0].length })
          }
        }
      }
      
      while ((match = throwRegex.exec(text)) !== null) {
        const absolutePos = line.from + match.index
        if (!isInComment(doc, absolutePos)) {
          builder.add(absolutePos, absolutePos + match[0].length, throwDecoration)
          matchedRanges.push({ from: absolutePos, to: absolutePos + match[0].length })
        }
      }

      const allAtRegex = /@/g
      while ((match = allAtRegex.exec(text)) !== null) {
        const absolutePos = line.from + match.index
        if (!isInComment(doc, absolutePos)) {
          const isMatched = matchedRanges.some(range => 
            absolutePos >= range.from && absolutePos < range.to
          )
          if (!isMatched) {
            const nextChar = text[match.index + 1]
            if (!nextChar || !/[A-Z_]/.test(nextChar)) {
              let endPos = absolutePos + 1
              if (nextChar && /[a-zA-Z_]/.test(nextChar)) {
                const identifierMatch = text.substring(match.index + 1).match(/^[a-zA-Z_][a-zA-Z0-9_]*/)
                if (identifierMatch) {
                  endPos = absolutePos + 1 + identifierMatch[0].length
                }
              }
              builder.add(absolutePos, endPos, standaloneAtDecoration)
            }
          }
        }
      }

      const tableRegex = /#([a-zA-Z_][a-zA-Z0-9_]*)\b/g
      while ((match = tableRegex.exec(text)) !== null) {
        const absolutePos = line.from + match.index
        if (!isInComment(doc, absolutePos)) {
          builder.add(absolutePos, absolutePos + match[0].length, tableAccessDecoration)
        }
      }

      const percentageRegex = /%([a-zA-Z_][a-zA-Z0-9_]*)\b/g
      while ((match = percentageRegex.exec(text)) !== null) {
        const absolutePos = line.from + match.index
        if (!isInComment(doc, absolutePos)) {
          builder.add(absolutePos, absolutePos + match[0].length, percentageDecoration)
        }
      }
    }

    return builder.finish()
  }

  const enfyraSyntaxPlugin = computed(() => {
    const m = getModules()
    if (!m) return null
    return m.StateField.define({
    create(state: any) {
      return buildEnfyraDecorations({ state } as any)
    },
    update(decorations: any, transaction: any) {
      if (transaction.docChanged) {
        return buildEnfyraDecorations({ state: transaction.state } as any)
      }
      return decorations.map(transaction.changes)
    },
      provide: (f: any) => m.EditorView.decorations.from(f)
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
      return 0; // No indent after <script>
    }
    
    const trimmedPrev = prevLineText.trim();
    const rootLevelPatterns = [
      /^(import|export|const|let|var|function|class)\b/,
      /^\/\//,  // comments
      /^\/\*/,  // block comments
    ];
    
    const isRootLevel = rootLevelPatterns.some(pattern => pattern.test(trimmedPrev)) 
                       && !trimmedPrev.includes('{') 
                       && !trimmedPrev.endsWith('{')
                       && !trimmedPrev.includes('(');
    
    if (isRootLevel) {
      return 0; // No indent for root level statements
    }
    
    const baseIndent = /^\s*/.exec(prevLineText)?.[0]?.length || 0;
    
    const trimmed = prevLineText.trim();
    const shouldIndent = trimmed.endsWith('{') || 
                         trimmed.endsWith('(') ||
                         /\b(if|for|while|function)\s*\([^)]*\)\s*{$/.test(trimmed) ||
                         /^function\s+\w+\s*\([^)]*\)\s*{/.test(trimmed);
    
    if (shouldIndent) {
      return baseIndent + 2; // Indent inside blocks
    }
    
      return baseIndent; // Keep same level
    })
  })

  function getLanguageExtension(language?: "javascript" | "vue" | "json" | "html" | "typescript") {
    const m = getModules()
    if (!m) return null
    switch (language) {
      case "vue":
        return m.vue();
      case "html":
        return m.html();
      case "javascript":
      default:
        return m.javascript({ jsx: true, typescript: false });
    }
  }

  const createLinter = (language?: "javascript" | "vue" | "json" | "html" | "typescript", onDiagnostics?: (diags: any[]) => void) => {
    const m = getModules()
    if (!m) return () => []
    return m.linter(async (view: any) => {
      const diagnostics: any[] = [];
      
      if (onDiagnostics) {
        onDiagnostics(diagnostics);
      }
      
      return diagnostics;
    });
  };

  const getBasicSetup = (language?: "javascript" | "vue" | "json" | "html" | "typescript", onDiagnostics?: (diags: any[]) => void) => {
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
      m.autocompletion(),
      m.highlightSelectionMatches(),
      m.indentUnit.of("  "),
      createLinter(language, onDiagnostics),
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
                const indent = currentIndent + '  '; // Add 2 spaces

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
    } else if (language === 'javascript' || language === 'html' || language === 'json') {
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