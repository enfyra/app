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

  let _compartment: any = null
  const themeCompartment = computed(() => {
    const m = modules.value
    if (!m?.Compartment) return null
    if (!_compartment) _compartment = new m.Compartment()
    return _compartment
  })

  const customTheme = computed(() => {
    const m = modules.value
    if (!m?.EditorView) return null

    if (isDark.value) {
      return m.EditorView.baseTheme({
        "&": {
          backgroundColor: "var(--block-base)",
          color: "var(--text-primary)",
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
          backgroundColor: "color-mix(in srgb, var(--md-primary) 28%, transparent) !important",
          color: "inherit !important",
        },

        ".cm-line": {
          padding: "0 8px",
        },

        ".cm-gutters": {
          backgroundColor: "var(--block-low)",
          color: "var(--text-tertiary)",
          borderRight: "1px solid var(--border-neutral)",
        },

        ".cm-activeLine": {
          backgroundColor: "var(--block-muted)",
        },

        ".cm-selectionBackground": {
          backgroundColor: "color-mix(in srgb, var(--md-primary) 28%, transparent) !important",
        },

        "&.cm-focused .cm-selectionBackground": {
          backgroundColor: "color-mix(in srgb, var(--md-primary) 28%, transparent) !important",
        },

        ".cm-selectionMatch": {
          backgroundColor: "color-mix(in srgb, var(--md-primary) 18%, transparent)",
        },

        ".cm-cursor": {
          borderLeft: "2px solid var(--text-primary)",
        },

        ".cm-tooltip": {
          backgroundColor: "var(--block-high)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-default)",
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
            backgroundColor: "var(--state-primary-soft-bg)",
            color: "var(--state-primary-soft-text)",
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
            color: "var(--text-tertiary)",
            fontStyle: "italic",
          },
        },

        ".cm-tooltip-hover": {
          backgroundColor: "var(--block-high)",
          border: "1px solid var(--border-default)",
          padding: "8px",
          maxWidth: "500px",
        },

        ".cm-diagnostic": {
          backgroundColor: "var(--block-high)",
          border: "1px solid var(--border-default)",
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
          backgroundColor: "var(--block-base)",
          color: "var(--text-primary)",
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
          backgroundColor: "color-mix(in srgb, var(--md-primary) 24%, transparent) !important",
          color: "inherit !important",
        },

        ".cm-line": {
          padding: "0 8px",
        },

        ".cm-gutters": {
          backgroundColor: "var(--block-low)",
          color: "var(--text-tertiary)",
          borderRight: "1px solid var(--border-neutral)",
        },

        ".cm-activeLine": {
          backgroundColor: "var(--block-muted)",
        },

        ".cm-selectionBackground": {
          backgroundColor: "color-mix(in srgb, var(--md-primary) 24%, transparent) !important",
        },

        "&.cm-focused .cm-selectionBackground": {
          backgroundColor: "color-mix(in srgb, var(--md-primary) 24%, transparent) !important",
        },

        ".cm-selectionMatch": {
          backgroundColor: "color-mix(in srgb, var(--md-primary) 16%, transparent)",
        },

        ".cm-cursor": {
          borderLeft: "2px solid var(--text-primary)",
        },

        ".cm-tooltip": {
          backgroundColor: "var(--block-high)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-neutral)",
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
            backgroundColor: "var(--state-primary-soft-bg)",
            color: "var(--state-primary-soft-text)",
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
            color: "var(--text-tertiary)",
            fontStyle: "italic",
          },
        },

        ".cm-tooltip-hover": {
          backgroundColor: "var(--block-high)",
          border: "1px solid var(--border-neutral)",
          padding: "8px",
          maxWidth: "500px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        },

        ".cm-diagnostic": {
          backgroundColor: "var(--block-high)",
          border: "1px solid var(--border-neutral)",
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