export const useCodeMirrorLazy = () => {
  const codeMirrorModules = ref<any>(null)
  const loading = ref(false)
  const initialized = ref(false)

  const initCodeMirror = async () => {
    if (codeMirrorModules.value || initialized.value) {
      return codeMirrorModules.value
    }

    loading.value = true
    initialized.value = true

    try {
      const [
        viewModule,
        stateModule,
        commandsModule,
        autocompleteModule,
        languageModule,
        lintModule,
        searchModule,
        langJsModule,
        langVueModule,
        langHtmlModule,
        themeModule,
      ] = await Promise.all([
        import('@codemirror/view'),
        import('@codemirror/state'),
        import('@codemirror/commands'),
        import('@codemirror/autocomplete'),
        import('@codemirror/language'),
        import('@codemirror/lint'),
        import('@codemirror/search'),
        import('@codemirror/lang-javascript'),
        import('@codemirror/lang-vue'),
        import('@codemirror/lang-html'),
        import('@uiw/codemirror-theme-vscode'),
      ])

      codeMirrorModules.value = {
        EditorView: viewModule.EditorView,
        lineNumbers: viewModule.lineNumbers,
        highlightActiveLine: viewModule.highlightActiveLine,
        keymap: viewModule.keymap,
        drawSelection: viewModule.drawSelection,
        dropCursor: viewModule.dropCursor,
        rectangularSelection: viewModule.rectangularSelection,
        crosshairCursor: viewModule.crosshairCursor,
        Decoration: viewModule.Decoration,
        StateEffect: stateModule.StateEffect,
        StateField: stateModule.StateField,
        Compartment: stateModule.Compartment,
        RangeSetBuilder: stateModule.RangeSetBuilder,
        indentWithTab: commandsModule.indentWithTab,
        history: commandsModule.history,
        defaultKeymap: commandsModule.defaultKeymap,
        historyKeymap: commandsModule.historyKeymap,
        insertNewlineAndIndent: commandsModule.insertNewlineAndIndent,
        closeBrackets: autocompleteModule.closeBrackets,
        closeBracketsKeymap: autocompleteModule.closeBracketsKeymap,
        autocompletion: autocompleteModule.autocompletion,
        completionKeymap: autocompleteModule.completionKeymap,
        bracketMatching: languageModule.bracketMatching,
        indentUnit: languageModule.indentUnit,
        foldGutter: languageModule.foldGutter,
        foldKeymap: languageModule.foldKeymap,
        indentOnInput: languageModule.indentOnInput,
        indentService: languageModule.indentService,
        linter: lintModule.linter,
        lintGutter: lintModule.lintGutter,
        searchKeymap: searchModule.searchKeymap,
        highlightSelectionMatches: searchModule.highlightSelectionMatches,
        javascript: langJsModule.javascript,
        vue: langVueModule.vue,
        html: langHtmlModule.html,
        vscodeDark: themeModule.vscodeDark,
        vscodeLight: themeModule.vscodeLight,
      }

      return codeMirrorModules.value
    } catch (error) {
      console.error('Failed to load CodeMirror:', error)
      initialized.value = false
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    codeMirrorModules: readonly(codeMirrorModules),
    loading: readonly(loading),
    initCodeMirror,
  }
}

