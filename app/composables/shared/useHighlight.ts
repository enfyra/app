export const useHighlight = () => {
  const hljs = ref<any>(null)
  const loading = ref(false)
  const initialized = ref(false)

  const initHighlight = async () => {
    if (hljs.value || initialized.value) {
      return hljs.value
    }

    loading.value = true
    initialized.value = true

    try {
      const hljsCore = await import('highlight.js/lib/core')
      const [
        javascript,
        typescript,
        json,
        html,
        css,
        python,
        sql,
        bash,
        shell,
        yaml,
        markdown,
      ] = await Promise.all([
        import('highlight.js/lib/languages/javascript'),
        import('highlight.js/lib/languages/typescript'),
        import('highlight.js/lib/languages/json'),
        import('highlight.js/lib/languages/xml'),
        import('highlight.js/lib/languages/css'),
        import('highlight.js/lib/languages/python'),
        import('highlight.js/lib/languages/sql'),
        import('highlight.js/lib/languages/bash'),
        import('highlight.js/lib/languages/shell'),
        import('highlight.js/lib/languages/yaml'),
        import('highlight.js/lib/languages/markdown'),
      ])

      hljsCore.default.registerLanguage('javascript', javascript.default)
      hljsCore.default.registerLanguage('js', javascript.default)
      hljsCore.default.registerLanguage('typescript', typescript.default)
      hljsCore.default.registerLanguage('ts', typescript.default)
      hljsCore.default.registerLanguage('json', json.default)
      hljsCore.default.registerLanguage('html', html.default)
      hljsCore.default.registerLanguage('xml', html.default)
      hljsCore.default.registerLanguage('css', css.default)
      hljsCore.default.registerLanguage('python', python.default)
      hljsCore.default.registerLanguage('py', python.default)
      hljsCore.default.registerLanguage('sql', sql.default)
      hljsCore.default.registerLanguage('bash', bash.default)
      hljsCore.default.registerLanguage('shell', shell.default)
      hljsCore.default.registerLanguage('sh', shell.default)
      hljsCore.default.registerLanguage('yaml', yaml.default)
      hljsCore.default.registerLanguage('yml', yaml.default)
      hljsCore.default.registerLanguage('markdown', markdown.default)
      hljsCore.default.registerLanguage('md', markdown.default)

      hljs.value = hljsCore.default
      return hljs.value
    } catch (error) {
      console.error('Failed to load highlight.js:', error)
      initialized.value = false
      throw error
    } finally {
      loading.value = false
    }
  }

  const highlight = (text: string, language?: string) => {
    if (!hljs.value) {
      throw new Error('highlight.js not initialized. Call initHighlight() first.')
    }

    if (language && hljs.value.getLanguage(language)) {
      try {
        return hljs.value.highlight(text, { language }).value
      } catch (err) {
        return hljs.value.highlightAuto(text).value
      }
    }

    return hljs.value.highlightAuto(text).value
  }

  const getLanguage = (lang: string) => {
    if (!hljs.value) return false
    return hljs.value.getLanguage(lang)
  }

  const reset = () => {
    hljs.value = null
    loading.value = false
    initialized.value = false
  }

  return {
    hljs: readonly(hljs),
    loading: readonly(loading),
    initHighlight,
    highlight,
    getLanguage,
    reset,
  }
}

