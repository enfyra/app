import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

export function useCodeMirrorTheme(height?: string) {
  // VS Code Dark+ theme syntax highlighting
  const vscodeHighlightStyle = HighlightStyle.define([
    { tag: tags.keyword, color: "#569CD6" },                              
    { tag: tags.controlKeyword, color: "#C586C0" },                       
    { tag: tags.operatorKeyword, color: "#569CD6" },                      
    { tag: tags.modifier, color: "#569CD6" },                             
    { tag: tags.string, color: "#CE9178" },                               
    { tag: tags.number, color: "#B5CEA8" },                               
    { tag: tags.bool, color: "#569CD6" },                                 
    { tag: tags.null, color: "#569CD6" },                                 
    { tag: tags.variableName, color: "#9CDCFE" },                         
    { tag: tags.function(tags.variableName), color: "#DCDCAA" },          
    { tag: tags.definition(tags.function(tags.variableName)), color: "#DCDCAA" }, 
    { tag: tags.propertyName, color: "#9CDCFE" },                         
    { tag: tags.attributeName, color: "#92C5F8" },                        
    { tag: tags.comment, color: "#6A9955", fontStyle: "italic" },         
    { tag: tags.lineComment, color: "#6A9955", fontStyle: "italic" },     
    { tag: tags.blockComment, color: "#6A9955", fontStyle: "italic" },    
    { tag: tags.operator, color: "#D4D4D4" },                             
    { tag: tags.bracket, color: "#FFD700" },                              
    { tag: tags.punctuation, color: "#D4D4D4" },                          
    { tag: tags.angleBracket, color: "#808080" },                         
    { tag: tags.squareBracket, color: "#FFD700" },                        
    { tag: tags.paren, color: "#FFD700" },                                
    { tag: tags.brace, color: "#FFD700" },                                
    { tag: tags.regexp, color: "#D16969" },                               
    { tag: tags.escape, color: "#D7BA7D" },                               
    { tag: tags.special(tags.string), color: "#D7BA7D" },                 
    { tag: tags.meta, color: "#569CD6" },                                 
    { tag: tags.invalid, color: "#F44747", textDecoration: "underline" }, 
    // HTML/XML tags for Vue templates
    { tag: tags.tagName, color: "#4FC1FF" },
    { tag: tags.content, color: "#D4D4D4" },
    { tag: tags.typeName, color: "#4EC9B0" },
  ]);

  // VS Code-style dark theme
  const customTheme = computed(() => EditorView.baseTheme({
    "&": {
      backgroundColor: "#1e1e1e",
      color: "#d4d4d4",
      fontSize: "14px",
      fontFamily: "'Fira Code', monospace",
      borderRadius: "8px",
      border: "1px solid #3c3c3c",
      overflow: "hidden",
      height: height || "400px",
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

    // Autocomplete dropdown styles
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

    // Hover info tooltip
    ".cm-tooltip-hover": {
      backgroundColor: "#1e1e1e",
      border: "1px solid #454545",
      padding: "8px",
      maxWidth: "500px",
    },

    // Diagnostic tooltips
    ".cm-diagnostic": {
      backgroundColor: "#252526",
      border: "1px solid #454545",
      padding: "4px 8px",
      borderRadius: "4px",
    },

    // Enfyra custom syntax highlighting
    ".cm-enfyra-template": {
      color: "#4EC9B0 !important", // Teal color for @ templates
      fontWeight: "bold !important",
    },
    
    ".cm-enfyra-table": {
      color: "#DCDCAA !important", // Yellow color for # table access
      fontWeight: "bold !important",
    },
    
    ".cm-enfyra-percentage": {
      color: "#F44747 !important", // Red color for % percentage syntax
      fontWeight: "bold !important",
    },
  }));

  return {
    vscodeHighlightStyle,
    customTheme,
    syntaxHighlighting: () => syntaxHighlighting(vscodeHighlightStyle, { fallback: true })
  };
}