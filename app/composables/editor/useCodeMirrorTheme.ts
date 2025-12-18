export function useCodeMirrorTheme(height?: string | Ref<string>, codeMirrorModules?: Ref<any> | any, colorModeRef?: any) {
  let colorMode: any;
  if (colorModeRef !== undefined && colorModeRef !== null) {
    colorMode = colorModeRef;
  } else {
    colorMode = useColorMode();
  }
  const heightValue = computed(() => {
    if (!height) return "400px";
    return typeof height === "string" ? height : height.value;
  });

  const isDark = computed(() => colorMode.value === 'dark');

  const modules = computed(() => {
    if (!codeMirrorModules) return null
    return isRef(codeMirrorModules) ? codeMirrorModules.value : codeMirrorModules
  })

  const themeCompartmentRef = ref<any>(null)

  watch(modules, (m) => {
    if (m?.Compartment && !themeCompartmentRef.value) {
      themeCompartmentRef.value = new m.Compartment()
    }
  }, { immediate: true })

  const themeCompartment = computed(() => themeCompartmentRef.value)

  const customTheme = computed(() => {
    const m = modules.value
    if (!m?.EditorView) return null

    if (isDark.value) {
      return m.EditorView.baseTheme({
        "&": {
          backgroundColor: "#09090b",
          color: "#e4e4e7",
          fontSize: "14px",
          fontFamily: "'Fira Code', monospace",
          borderRadius: "8px",
          border: "none",
          overflow: "hidden",
          height: "100%",
        },

        ".cm-content": {
          padding: "0",
          lineHeight: "1.6",
        },

        ".cm-content ::selection": {
          backgroundColor: "#264F78 !important",
          color: "inherit !important",
        },

        ".cm-line": {
          padding: "0 8px",
        },

        ".cm-gutters": {
          backgroundColor: "#0c0c0e",
          color: "#858585",
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        },

        ".cm-activeLine": {
          backgroundColor: "#2a2d2e",
        },

        ".cm-selectionBackground": {
          backgroundColor: "#264F78 !important",
        },

        "&.cm-focused .cm-selectionBackground": {
          backgroundColor: "#264F78 !important",
        },

        ".cm-selectionMatch": {
          backgroundColor: "#515c6a80",
        },

        ".cm-cursor": {
          borderLeft: "2px solid white",
        },

        ".cm-tooltip": {
          backgroundColor: "#252526",
          color: "#d4d4d4",
          border: "1px solid #454545",
          borderRadius: "4px",
          padding: "0",
        },

        ".cm-tooltip-autocomplete": {
          "& > ul": {
            maxHeight: "200px",
            fontFamily: "'Fira Code', monospace",
            fontSize: "13px",
          },
          "& > ul > li": {
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            minHeight: "24px",
          },
          "& > ul > li[aria-selected]": {
            backgroundColor: "#094771",
            color: "#ffffff",
          },
          "& .cm-completionIcon": {
            width: "16px",
            marginRight: "4px",
            opacity: "0.7",
          },
          "& .cm-completionLabel": {
            flex: "1",
          },
          "& .cm-completionDetail": {
            marginLeft: "8px",
            color: "#858585",
            fontStyle: "italic",
          },
        },

        ".cm-tooltip-hover": {
          backgroundColor: "#1e1e1e",
          border: "1px solid #454545",
          padding: "8px",
          maxWidth: "500px",
        },

        ".cm-diagnostic": {
          backgroundColor: "#252526",
          border: "1px solid #454545",
          padding: "4px 8px",
          borderRadius: "4px",
        },

         ".cm-enfyra-template": {
           color: "#4EC9B0 !important",
           fontWeight: "bold !important",
           backgroundColor: "transparent !important",
           textDecoration: "none !important",
         },
         ".cm-enfyra-template *": {
           color: "#4EC9B0 !important",
           fontWeight: "bold !important",
         },
         "span.cm-enfyra-template": {
           color: "#4EC9B0 !important",
           fontWeight: "bold !important",
         },

         ".cm-enfyra-table": {
           color: "#DCDCAA !important",
           fontWeight: "bold !important",
           backgroundColor: "transparent !important",
           textDecoration: "none !important",
         },
         ".cm-enfyra-table *": {
           color: "#DCDCAA !important",
           fontWeight: "bold !important",
         },
         "span.cm-enfyra-table": {
           color: "#DCDCAA !important",
           fontWeight: "bold !important",
         },

         ".cm-enfyra-percentage": {
           color: "#C586C0 !important",
           fontWeight: "bold !important",
           backgroundColor: "transparent !important",
           textDecoration: "none !important",
         },
         ".cm-enfyra-percentage *": {
           color: "#C586C0 !important",
           fontWeight: "bold !important",
         },
         "span.cm-enfyra-percentage": {
           color: "#C586C0 !important",
           fontWeight: "bold !important",
         },

         ".cm-enfyra-throw": {
           color: "#F48771 !important",
           fontWeight: "bold !important",
           backgroundColor: "transparent !important",
           textDecoration: "none !important",
         },
         ".cm-enfyra-throw *": {
           color: "#F48771 !important",
           fontWeight: "bold !important",
         },
         "span.cm-enfyra-throw": {
           color: "#F48771 !important",
           fontWeight: "bold !important",
         },
      });
    } else {
      return m.EditorView.baseTheme({
        "&": {
          backgroundColor: "#ffffff",
          color: "#1e1e1e",
          fontSize: "14px",
          fontFamily: "'Fira Code', monospace",
          borderRadius: "8px",
          border: "none",
          overflow: "hidden",
          height: "100%",
        },

        ".cm-content": {
          padding: "0",
          lineHeight: "1.6",
        },

        ".cm-content ::selection": {
          backgroundColor: "#add6ff !important",
          color: "inherit !important",
        },

        ".cm-line": {
          padding: "0 8px",
        },

        ".cm-gutters": {
          backgroundColor: "#f8f9fa",
          color: "#6e7681",
          borderRight: "1px solid #e5e7eb",
        },

        ".cm-activeLine": {
          backgroundColor: "#f6f8fa",
        },

        ".cm-selectionBackground": {
          backgroundColor: "#add6ff !important",
        },

        "&.cm-focused .cm-selectionBackground": {
          backgroundColor: "#add6ff !important",
        },

        ".cm-selectionMatch": {
          backgroundColor: "#c8e1ff80",
        },

        ".cm-cursor": {
          borderLeft: "2px solid #1e1e1e",
        },

        ".cm-tooltip": {
          backgroundColor: "#ffffff",
          color: "#1e1e1e",
          border: "1px solid #e5e7eb",
          borderRadius: "4px",
          padding: "0",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        },

        ".cm-tooltip-autocomplete": {
          "& > ul": {
            maxHeight: "200px",
            fontFamily: "'Fira Code', monospace",
            fontSize: "13px",
          },
          "& > ul > li": {
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            minHeight: "24px",
          },
          "& > ul > li[aria-selected]": {
            backgroundColor: "#0969da",
            color: "#ffffff",
          },
          "& .cm-completionIcon": {
            width: "16px",
            marginRight: "4px",
            opacity: "0.7",
          },
          "& .cm-completionLabel": {
            flex: "1",
          },
          "& .cm-completionDetail": {
            marginLeft: "8px",
            color: "#6e7681",
            fontStyle: "italic",
          },
        },

        ".cm-tooltip-hover": {
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          padding: "8px",
          maxWidth: "500px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        },

        ".cm-diagnostic": {
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          padding: "4px 8px",
          borderRadius: "4px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        },

        ".cm-enfyra-template": {
          color: "#0969da !important",
          fontWeight: "bold !important",
          backgroundColor: "transparent !important",
          textDecoration: "none !important",
        },
        ".cm-enfyra-template *": {
          color: "#0969da !important",
          fontWeight: "bold !important",
        },

        ".cm-enfyra-table": {
          color: "#953800 !important",
          fontWeight: "bold !important",
          backgroundColor: "transparent !important",
          textDecoration: "none !important",
        },
        ".cm-enfyra-table *": {
          color: "#953800 !important",
          fontWeight: "bold !important",
        },

        ".cm-enfyra-percentage": {
          color: "#8250df !important",
          fontWeight: "bold !important",
          backgroundColor: "transparent !important",
          textDecoration: "none !important",
        },
        ".cm-enfyra-percentage *": {
          color: "#8250df !important",
          fontWeight: "bold !important",
        },

        ".cm-enfyra-throw": {
          color: "#cf222e !important",
          fontWeight: "bold !important",
          backgroundColor: "transparent !important",
          textDecoration: "none !important",
        },
        ".cm-enfyra-throw *": {
          color: "#cf222e !important",
          fontWeight: "bold !important",
        },
      });
    }
  });

  const vscodeTheme = computed(() => {
    const m = modules.value
    if (!m) return null
    return isDark.value ? m.vscodeDark : m.vscodeLight
  });

  const customHighlightStyle = computed(() => {
    const m = modules.value
    if (!m?.HighlightStyle || !m?.syntaxHighlighting || !m?.tags) return null
    
    if (isDark.value) {
      const t = m.tags
      const styleRules: any[] = []
      
      if (t.keyword && t.keyword.id !== undefined) styleRules.push({ tag: t.keyword, color: "#0000ff" })
      if (t.operator && t.operator.id !== undefined) styleRules.push({ tag: t.operator, color: "#e4e4e7" })
      if (t.bracket && t.bracket.id !== undefined) styleRules.push({ tag: t.bracket, color: "#e4e4e7" })
      if (t.tagName && t.tagName.id !== undefined) styleRules.push({ tag: t.tagName, color: "#800000" })
      if (t.string && t.string.id !== undefined) styleRules.push({ tag: t.string, color: "#008000" })
      if (t.number && t.number.id !== undefined) styleRules.push({ tag: t.number, color: "#098658" })
      if (t.variableName && t.variableName.id !== undefined) styleRules.push({ tag: t.variableName, color: "#001080" })
      if (t.propertyName && t.propertyName.id !== undefined) styleRules.push({ tag: t.propertyName, color: "#001080" })
      if (t.function && t.function.id !== undefined) styleRules.push({ tag: t.function, color: "#795e26" })
      if (t.comment && t.comment.id !== undefined) styleRules.push({ tag: t.comment, color: "#008000" })
      if (t.meta && t.meta.id !== undefined) styleRules.push({ tag: t.meta, color: "#e4e4e7" })
      if (t.typeName && t.typeName.id !== undefined) styleRules.push({ tag: t.typeName, color: "#267f99" })
      if (t.className && t.className.id !== undefined) styleRules.push({ tag: t.className, color: "#267f99" })
      if (t.constant && t.constant.id !== undefined) styleRules.push({ tag: t.constant, color: "#811f3f" })
      
      if (styleRules.length === 0) return null
      
      try {
        const lightStyle = m.HighlightStyle.define(styleRules)
        return m.syntaxHighlighting(lightStyle)
      } catch (error) {
        console.error('Error creating custom highlight style:', error)
        return null
      }
    }
    return null
  });

  const themeExtensions = computed(() => {
    if (!customTheme.value) return []
    const exts = [customTheme.value]
    if (vscodeTheme.value) {
      exts.unshift(vscodeTheme.value)
    }
    return exts
  });

  return {
    customTheme,
    vscodeTheme,
    themeCompartment,
    themeExtensions,
    customHighlightStyle,
  };
}