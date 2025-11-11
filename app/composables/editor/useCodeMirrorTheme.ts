import { EditorView } from "@codemirror/view";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

export function useCodeMirrorTheme(height?: string | Ref<string>) {
  const heightValue = computed(() => {
    if (!height) return "400px";
    return typeof height === "string" ? height : height.value;
  });

  const customTheme = computed(() => EditorView.baseTheme({
    "&": {
      backgroundColor: "#1e1e1e",
      color: "#d4d4d4",
      fontSize: "14px",
      fontFamily: "'Fira Code', monospace",
      borderRadius: "8px",
      border: "1px solid #3c3c3c",
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
      borderRight: "1px solid #3c3c3c",
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
      color: "#4EC9B0 !important", // Teal color for @ templates (@QUERY, @REQ, @RES, etc.)
      fontWeight: "bold !important",
      backgroundColor: "transparent !important",
      textDecoration: "none !important",
    },
    ".cm-enfyra-template *": {
      color: "#4EC9B0 !important",
      fontWeight: "bold !important",
    },

    ".cm-enfyra-table": {
      color: "#DCDCAA !important", // Yellow color for # table access
      fontWeight: "bold !important",
      backgroundColor: "transparent !important",
      textDecoration: "none !important",
    },
    ".cm-enfyra-table *": {
      color: "#DCDCAA !important",
      fontWeight: "bold !important",
    },

    ".cm-enfyra-percentage": {
      color: "#C586C0 !important", // Purple color for % percentage syntax
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
  }));

  return {
    customTheme,
    vscodeTheme: vscodeDark,
  };
}