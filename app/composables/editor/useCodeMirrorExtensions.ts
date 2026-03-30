export function useCodeMirrorExtensions(codeMirrorModules?: Ref<any> | any) {
  
  const modules = computed(() => {
    if (!codeMirrorModules) return null
    return isRef(codeMirrorModules) ? codeMirrorModules.value : codeMirrorModules
  })

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
      const blockCommentEnd = fullText.indexOf('*/', blockCommentStart)
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

    const allDecorations: Array<{ from: number; to: number; decoration: any }> = []

    for (let i = 1; i <= doc.lines; i++) {
      const line = doc.line(i)
      const text = line.text

      const templateRegex = /@(CACHE|REPOS|HELPERS|LOGS|ERRORS|BODY|DATA|STATUS|PARAMS|QUERY|USER|REQ|RES|SHARE|API|UPLOADED_FILE|PKGS|SOCKET)\b/g
      const templateWithBracketRegex = /@(CACHE|REPOS|HELPERS|LOGS|ERRORS|BODY|DATA|STATUS|PARAMS|QUERY|USER|REQ|RES|SHARE|API|UPLOADED_FILE|PKGS|SOCKET)\s*\[(['"])([^'"]*)\1\]/g
      const throwRegex = /@THROW\d*/g

      const matchedRanges: Array<{ from: number; to: number }> = []
      let match

      while ((match = templateWithBracketRegex.exec(text)) !== null) {
        const absolutePos = line.from + match.index
        if (!isInComment(doc, absolutePos)) {
          const fullMatch = match[0]
          allDecorations.push({ from: absolutePos, to: absolutePos + fullMatch.length, decoration: templateDecoration })
          matchedRanges.push({ from: absolutePos, to: absolutePos + fullMatch.length })
        }
      }

      while ((match = templateRegex.exec(text)) !== null) {
        const absolutePos = line.from + match.index
        if (!isInComment(doc, absolutePos)) {
          const isAlreadyMatched = matchedRanges.some(range =>
            absolutePos >= range.from && absolutePos < range.to
          )
          if (!isAlreadyMatched) {
            allDecorations.push({ from: absolutePos, to: absolutePos + match[0].length, decoration: templateDecoration })
            matchedRanges.push({ from: absolutePos, to: absolutePos + match[0].length })
          }
        }
      }

      while ((match = throwRegex.exec(text)) !== null) {
        const absolutePos = line.from + match.index
        if (!isInComment(doc, absolutePos)) {
          allDecorations.push({ from: absolutePos, to: absolutePos + match[0].length, decoration: throwDecoration })
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
            if (!nextChar) {
              allDecorations.push({ from: absolutePos, to: absolutePos + 1, decoration: standaloneAtDecoration })
            }
          }
        }
      }

      const tableRegex = /#([a-zA-Z_][a-zA-Z0-9_]*)\b/g
      while ((match = tableRegex.exec(text)) !== null) {
        const absolutePos = line.from + match.index
        if (!isInComment(doc, absolutePos)) {
          allDecorations.push({ from: absolutePos, to: absolutePos + match[0].length, decoration: tableAccessDecoration })
        }
      }

      const percentageRegex = /%([a-zA-Z_][a-zA-Z0-9_]*)\b/g
      while ((match = percentageRegex.exec(text)) !== null) {
        const absolutePos = line.from + match.index
        if (!isInComment(doc, absolutePos)) {
          allDecorations.push({ from: absolutePos, to: absolutePos + match[0].length, decoration: percentageDecoration })
        }
      }
    }

    allDecorations.sort((a, b) => a.from - b.from)

    for (const dec of allDecorations) {
      builder.add(dec.from, dec.to, dec.decoration)
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

  const ENFYRA_COMPLETIONS = [
    { label: '@BODY', type: 'variable', detail: 'Request body ($ctx.$body)' },
    { label: '@QUERY', type: 'variable', detail: 'Query params ($ctx.$query)' },
    { label: '@PARAMS', type: 'variable', detail: 'Route params ($ctx.$params)' },
    { label: '@USER', type: 'variable', detail: 'Current user ($ctx.$user)' },
    { label: '@HELPERS', type: 'variable', detail: 'Helpers: $jwt, $bcrypt, autoSlug' },
    { label: '@DATA', type: 'variable', detail: 'Response data (post-hooks)' },
    { label: '@STATUS', type: 'variable', detail: 'Status code (post-hooks)' },
    { label: '@PAYLOAD', type: 'variable', detail: 'Flow input payload' },
    { label: '@LAST', type: 'variable', detail: 'Last step result' },
    { label: '@FLOW', type: 'variable', detail: 'Flow data chain' },
    { label: '@META', type: 'variable', detail: 'Flow metadata (flowId, flowName)' },
    { label: '@DISPATCH', type: 'variable', detail: 'Flow trigger service' },
    { label: '@DISPATCH.trigger', type: 'function', detail: 'Trigger another flow' },
    { label: '@REPOS', type: 'variable', detail: 'All repositories' },
    { label: '@THROW400', type: 'function', detail: 'Throw Bad Request' },
    { label: '@THROW401', type: 'function', detail: 'Throw Unauthorized' },
    { label: '@THROW403', type: 'function', detail: 'Throw Forbidden' },
    { label: '@THROW404', type: 'function', detail: 'Throw Not Found' },
    { label: '@THROW500', type: 'function', detail: 'Throw Internal Error' },
  ];

  const ENFYRA_METHOD_COMPLETIONS = [
    { label: '.find', type: 'method', detail: '({ filter, fields, limit, sort })' },
    { label: '.findOne', type: 'method', detail: '({ filter, fields })' },
    { label: '.create', type: 'method', detail: '({ data })' },
    { label: '.update', type: 'method', detail: '({ id, data })' },
    { label: '.delete', type: 'method', detail: '({ id })' },
    { label: '.count', type: 'method', detail: '({ filter })' },
    { label: '.aggregate', type: 'method', detail: '({ aggregate })' },
  ];

  const VUE_COMPLETIONS = [
    { label: 'ref', type: 'function', detail: 'Reactive reference' },
    { label: 'reactive', type: 'function', detail: 'Reactive object' },
    { label: 'computed', type: 'function', detail: 'Computed property' },
    { label: 'readonly', type: 'function', detail: 'Readonly proxy' },
    { label: 'shallowRef', type: 'function', detail: 'Shallow reactive ref' },
    { label: 'shallowReactive', type: 'function', detail: 'Shallow reactive object' },
    { label: 'watch', type: 'function', detail: 'Watch reactive source' },
    { label: 'watchEffect', type: 'function', detail: 'Auto-tracking effect' },
    { label: 'onMounted', type: 'function', detail: 'Lifecycle: mounted' },
    { label: 'onUnmounted', type: 'function', detail: 'Lifecycle: unmounted' },
    { label: 'onBeforeMount', type: 'function', detail: 'Lifecycle: before mount' },
    { label: 'onBeforeUnmount', type: 'function', detail: 'Lifecycle: before unmount' },
    { label: 'onUpdated', type: 'function', detail: 'Lifecycle: updated' },
    { label: 'nextTick', type: 'function', detail: 'Next DOM update' },
    { label: 'defineProps', type: 'function', detail: 'Declare props' },
    { label: 'defineEmits', type: 'function', detail: 'Declare emits' },
    { label: 'defineExpose', type: 'function', detail: 'Expose to parent' },
    { label: 'resolveComponent', type: 'function', detail: 'Resolve dynamic component' },
    { label: 'h', type: 'function', detail: 'Create VNode' },
    { label: 'toRef', type: 'function', detail: 'Property to ref' },
    { label: 'toRefs', type: 'function', detail: 'Object to refs' },
    { label: 'unref', type: 'function', detail: 'Unwrap ref value' },
    { label: 'isRef', type: 'function', detail: 'Check if ref' },
    { label: 'toRaw', type: 'function', detail: 'Get raw object' },
    { label: 'markRaw', type: 'function', detail: 'Mark non-reactive' },
    { label: 'useRoute', type: 'function', detail: 'Nuxt: current route' },
    { label: 'useRouter', type: 'function', detail: 'Nuxt: router instance' },
    { label: 'navigateTo', type: 'function', detail: 'Nuxt: navigate' },
    { label: 'useState', type: 'function', detail: 'Nuxt: shared state' },
    { label: 'useCookie', type: 'function', detail: 'Nuxt: cookie ref' },
    { label: 'useNuxtApp', type: 'function', detail: 'Nuxt: app instance' },
    { label: 'useRuntimeConfig', type: 'function', detail: 'Nuxt: runtime config' },
    { label: 'useFetch', type: 'function', detail: 'Nuxt: fetch data' },
    { label: 'useAsyncData', type: 'function', detail: 'Nuxt: async data' },
    { label: 'useLazyFetch', type: 'function', detail: 'Nuxt: lazy fetch' },
    { label: 'useHead', type: 'function', detail: 'Nuxt: head meta' },
    { label: 'useToast', type: 'function', detail: 'Nuxt UI: toast notifications' },
    { label: 'useApi', type: 'function', detail: 'Enfyra: API client { data, execute, error, pending }' },
    { label: 'useAuth', type: 'function', detail: 'Enfyra: { me, login, logout, isLoggedIn }' },
    { label: 'usePermissions', type: 'function', detail: 'Enfyra: { hasPermission, checkPermissionCondition }' },
    { label: 'useSchema', type: 'function', detail: 'Enfyra: { schemas, fetchSchema, definition, editableFields, generateEmptyForm }' },
    { label: 'useGlobalState', type: 'function', detail: 'Enfyra: { settings, storageConfigs, sidebarVisible }' },
    { label: 'useScreen', type: 'function', detail: 'Enfyra: { isMobile, isTablet, isDesktop, width, height }' },
    { label: 'useConfirm', type: 'function', detail: 'Enfyra: { confirm({ title, content }) }' },
    { label: 'useHeaderActionRegistry', type: 'function', detail: 'Enfyra: register header actions' },
    { label: 'useSubHeaderActionRegistry', type: 'function', detail: 'Enfyra: register sub-header actions' },
    { label: 'useMenuRegistry', type: 'function', detail: 'Enfyra: { menuItems, registerMenuItem }' },
    { label: 'useFilterQuery', type: 'function', detail: 'Enfyra: { buildQuery, createEmptyFilter }' },
    { label: 'useDatabase', type: 'function', detail: 'Enfyra: { getId, getIdFieldName }' },
    { label: 'useRoutes', type: 'function', detail: 'Enfyra: route management' },
    { label: 'useHighlight', type: 'function', detail: 'Enfyra: code highlighting' },
    { label: 'useMounted', type: 'function', detail: 'Enfyra: { isMounted }' },
  ];

  const VUE_COMPONENT_COMPLETIONS = [
    { label: 'EmptyState', type: 'class', detail: 'Common: empty state display' },
    { label: 'LoadingState', type: 'class', detail: 'Common: loading indicator' },
    { label: 'ErrorState', type: 'class', detail: 'Common: error display' },
    { label: 'PageHeader', type: 'class', detail: 'Common: page header' },
    { label: 'FormCard', type: 'class', detail: 'Common: form container' },
    { label: 'Modal', type: 'class', detail: 'Common: modal dialog' },
    { label: 'Drawer', type: 'class', detail: 'Common: slide drawer' },
    { label: 'DataTable', type: 'class', detail: 'Data: sortable table' },
    { label: 'DataTableLazy', type: 'class', detail: 'Data: lazy-loaded table' },
    { label: 'FormEditor', type: 'class', detail: 'Form: metadata-driven editor' },
    { label: 'FilterEditor', type: 'class', detail: 'Form: filter builder' },
    { label: 'FieldSelector', type: 'class', detail: 'Form: field picker' },
    { label: 'ColumnSelector', type: 'class', detail: 'Data: column picker' },
    { label: 'FileManager', type: 'class', detail: 'File: file browser' },
    { label: 'MenuRenderer', type: 'class', detail: 'Menu: render menu tree' },
    { label: 'PermissionGate', type: 'class', detail: 'Permission: conditional render' },
    { label: 'PermissionManager', type: 'class', detail: 'Permission: manager UI' },
    { label: 'Widget', type: 'class', detail: 'Extension: embed widget by ID' },
    { label: 'WebSocketManager', type: 'class', detail: 'WebSocket: connection manager' },
    { label: 'UButton', type: 'class', detail: 'Nuxt UI: button' },
    { label: 'UCard', type: 'class', detail: 'Nuxt UI: card' },
    { label: 'UInput', type: 'class', detail: 'Nuxt UI: input' },
    { label: 'UTable', type: 'class', detail: 'Nuxt UI: table' },
    { label: 'UBadge', type: 'class', detail: 'Nuxt UI: badge' },
    { label: 'USelect', type: 'class', detail: 'Nuxt UI: select' },
    { label: 'UTextarea', type: 'class', detail: 'Nuxt UI: textarea' },
    { label: 'USwitch', type: 'class', detail: 'Nuxt UI: switch toggle' },
    { label: 'UForm', type: 'class', detail: 'Nuxt UI: form wrapper' },
    { label: 'UFormField', type: 'class', detail: 'Nuxt UI: form field' },
  ];

  function enfyraCompletionSource(m: any) {
    return (context: any) => {
      const before = context.matchBefore(/[@#%][\w.]*/);
      if (!before) {
        const dotBefore = context.matchBefore(/\.\w*/);
        if (dotBefore) {
          return { from: dotBefore.from, options: ENFYRA_METHOD_COMPLETIONS };
        }
        return null;
      }
      return { from: before.from, options: ENFYRA_COMPLETIONS };
    };
  }

  function vueCompletionSource(m: any) {
    return (context: any) => {
      const word = context.matchBefore(/[\w]*/);
      if (!word || word.from === word.to) return null;
      return { from: word.from, options: [...VUE_COMPLETIONS, ...VUE_COMPONENT_COMPLETIONS] };
    };
  }

  const getBasicSetup = (language?: "javascript" | "vue" | "json" | "html" | "typescript", onDiagnostics?: (diags: any[]) => void, enfyraAutocomplete?: boolean | 'vue') => {
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