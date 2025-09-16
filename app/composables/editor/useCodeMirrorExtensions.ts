import { javascript } from "@codemirror/lang-javascript";
import { vue } from "@codemirror/lang-vue";
import { html } from "@codemirror/lang-html";
import { linter, lintGutter } from "@codemirror/lint";
import * as acorn from "acorn";
import * as walk from "acorn-walk";
import {
  lineNumbers,
  highlightActiveLine,
  keymap,
  EditorView,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
} from "@codemirror/view";
import {
  indentWithTab,
  history,
  defaultKeymap,
  historyKeymap,
  insertNewlineAndIndent,
} from "@codemirror/commands";
import {
  closeBrackets,
  closeBracketsKeymap,
  autocompletion,
  completionKeymap,
} from "@codemirror/autocomplete";
import {
  bracketMatching,
  indentUnit,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentService,
} from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";

export function useCodeMirrorExtensions() {
  // Smart Vue indent service - disable indent only at script root level
  const vueIndentService = indentService.of((context, pos) => {
    const doc = context.state.doc;
    
    // Find the actual line that contains content before cursor
    let checkPos = pos - 1;
    let prevLineText = '';
    let actualPrevLine = null;
    
    // Walk backwards to find non-empty line
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
    
    // Check if we're right after opening <script> tag
    if (prevLineText.trim().match(/^<script[^>]*>$/)) {
      return 0; // No indent after <script>
    }
    
    // Check if previous line looks like it's at script root level
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
    
    // Use standard JavaScript indentation logic
    const baseIndent = /^\s*/.exec(prevLineText)?.[0]?.length || 0;
    
    // Check for patterns that should indent next line
    const trimmed = prevLineText.trim();
    const shouldIndent = trimmed.endsWith('{') || 
                         trimmed.endsWith('(') ||
                         /\b(if|for|while|function)\s*\([^)]*\)\s*{$/.test(trimmed) ||
                         /^function\s+\w+\s*\([^)]*\)\s*{/.test(trimmed);
    
    if (shouldIndent) {
      return baseIndent + 2; // Indent inside blocks
    }
    
    return baseIndent; // Keep same level
  });

  // Language extension - Only JavaScript, no TypeScript
  function getLanguageExtension(language?: "javascript" | "vue" | "json" | "html" | "typescript") {
    switch (language) {
      case "vue":
        return vue();
      case "html":
        return html();
      case "javascript":
      default:
        return javascript({ jsx: true, typescript: false });
    }
  }

  // Create linter based on language
  const createLinter = (language?: "javascript" | "vue" | "json" | "html" | "typescript", onDiagnostics?: (diags: any[]) => void) => {
    return linter((view) => {
      const diagnostics: any[] = [];
      const text = view.state.doc.toString();
      
      // Skip linting for json and html
      if (language === 'json' || language === 'html') {
        return diagnostics;
      }
      
      let codeToLint = text;
      let offset = 0;
      
      // For Vue files, extract script content
      if (language === 'vue') {
        const scriptMatch = text.match(/<script[^>]*>([\s\S]*?)<\/script>/);
        if (!scriptMatch) return diagnostics;
        
        codeToLint = scriptMatch[1] || '';
        // Calculate offset to the start of script content
        offset = text.indexOf(scriptMatch[1] || '');
      }
      
      try {
        // Parse với acorn - allow return at root level for JavaScript
        const parseOptions: any = {
          ecmaVersion: 2022,
          sourceType: "module",
          locations: true,
          onComment: undefined,
          allowAwaitOutsideFunction: true,
        };
        
        // For JavaScript, allow return statements at root level (for function expressions)
        if (language === 'javascript') {
          parseOptions.sourceType = "script"; // script mode allows return at root
          parseOptions.allowReturnOutsideFunction = true;
        }
        
        const ast = acorn.parse(codeToLint, parseOptions);
        
        // Track const variables
        const constVars = new Set<string>();
        
        // Walk through AST
        walk.simple(ast, {
          VariableDeclaration(node: any) {
            if (node.kind === 'const') {
              for (const decl of node.declarations) {
                if (decl.id.type === 'Identifier') {
                  constVars.add(decl.id.name);
                }
              }
            }
          },
          AssignmentExpression(node: any) {
            if (node.left.type === 'Identifier' && constVars.has(node.left.name)) {
              diagnostics.push({
                from: node.left.start + offset,
                to: node.left.end + offset,
                severity: 'error',
                message: `Cannot assign to const variable '${node.left.name}'`,
              });
            }
          },
          UpdateExpression(node: any) {
            if (node.argument.type === 'Identifier' && constVars.has(node.argument.name)) {
              diagnostics.push({
                from: node.start + offset,
                to: node.end + offset,
                severity: 'error',
                message: `Cannot update const variable '${node.argument.name}'`,
              });
            }
          }
        });
        
      } catch (error: any) {
        // Parse errors
        if (error.loc) {
          const errorPos = offset + (error.pos || 0);
          diagnostics.push({
            from: errorPos,
            to: errorPos + 1,
            severity: 'error',
            message: error.message.replace(/\s*\(\d+:\d+\)$/, ''),
          });
        }
      }
      
      // Emit diagnostics if callback provided
      if (onDiagnostics) {
        onDiagnostics(diagnostics);
      }
      
      return diagnostics;
    });
  };

  // Basic setup function that takes language parameter
  const getBasicSetup = (language?: "javascript" | "vue" | "json" | "html" | "typescript", onDiagnostics?: (diags: any[]) => void) => {
    const setup = [
      lineNumbers(),
      highlightActiveLine(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      rectangularSelection(),
      crosshairCursor(),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      highlightSelectionMatches(),
      indentUnit.of("  "),
      createLinter(language, onDiagnostics),
      lintGutter(),
      keymap.of([
        {
          key: "Enter",
          run: (view) => {
            // Check if cursor is between brackets
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
                // Insert newline with proper indentation
                view.dispatch({
                  changes: {
                    from: pos,
                    to: pos,
                    insert: '\n  \n'
                  },
                  selection: { anchor: pos + 3 }
                });
                return true;
              }
            }

            return insertNewlineAndIndent(view);
          },
        },
        {
          key: "Backspace",
          run: (view) => {
            const state = view.state;
            const pos = state.selection.main.head;
            const line = state.doc.lineAt(pos);

            // Only handle indented empty lines (has whitespace but cursor at end of line)
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
        indentWithTab,
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...searchKeymap,
      ]),
    ];
    
    // Add language-specific indentation
    if (language === 'vue') {
      // Use custom indent service for Vue to disable auto-indent
      setup.push(vueIndentService);
    } else if (language === 'javascript' || language === 'html' || language === 'json') {
      // Use default auto-indent for other languages
      setup.push(indentOnInput());
    }
    
    return setup;
  };

  return {
    getLanguageExtension,
    createLinter,
    getBasicSetup,
    basicSetup: getBasicSetup("javascript"), // Default for backward compatibility
  };
}