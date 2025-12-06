export function useCodeMirrorTheme(height?: string | Ref<string>, codeMirrorModules?: Ref<any> | any) {
  const colorMode = useColorMode();
  const heightValue = computed(() => {
    if (!height) return "400px";
    return typeof height === "string" ? height : height.value;
  });

  const isDark = computed(() => colorMode.value === 'dark');
  
  // Get modules (handle both ref and direct value)
  const modules = computed(() => {
    if (!codeMirrorModules) return null
    return isRef(codeMirrorModules) ? codeMirrorModules.value : codeMirrorModules
  })
  
  // Create a Compartment for theme management (only when modules loaded)
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
      backgroundColor: "#1e1e1e",
      color: "#d4d4d4",
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
      backgroundColor: "#252526",
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
  
  // Combined theme extensions
  const themeExtensions = computed(() => {
    if (!vscodeTheme.value || !customTheme.value) return []
    return [
      vscodeTheme.value,
      customTheme.value,
    ]
  });

  return {
    customTheme,
    vscodeTheme,
    themeCompartment,
    themeExtensions,
  };
}