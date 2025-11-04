import { parse } from 'acorn';
import { simple as walk } from 'acorn-walk';
import type { Diagnostic } from "@codemirror/lint";

interface AcornLintOptions {
  language: "javascript" | "vue" | "json" | "typescript" | "html";
  globals: Record<string, boolean>;
}

export class AcornLinter {
  private globals: Record<string, boolean>;

  constructor(globals: Record<string, boolean> = {}) {
    this.globals = {
      window: true,
      document: true,
      console: true,
      setTimeout: true,
      setInterval: true,
      clearTimeout: true,
      clearInterval: true,
      // Vue globals
      ref: true,
      reactive: true,
      computed: true,
      watch: true,
      onMounted: true,
      onUnmounted: true,
      defineProps: true,
      defineEmits: true,
      // Custom globals
      ...globals
    };
  }

  verify(code: string, options: AcornLintOptions): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Skip validation for HTML and JSON
    if (options.language === 'html' || options.language === 'json') {
      return diagnostics;
    }

    // For Vue files, extract script content
    let jsCode = code;
    let scriptOffset = 0;

    if (options.language === 'vue') {
      const result = this.extractVueScript(code);
      if (!result) return diagnostics; // No script section
      jsCode = result.content;
      scriptOffset = result.offset;
    }

    try {
      // Parse with Acorn
      const ast = parse(jsCode, {
        ecmaVersion: 2022,
        sourceType: 'module',
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true
      });

      // Custom validation rules
      this.validateAST(ast, jsCode, diagnostics, scriptOffset);

    } catch (error: any) {
      // Syntax error
      const pos = error.pos || 0;
      diagnostics.push({
        from: scriptOffset + pos,
        to: scriptOffset + pos + 1,
        severity: "error",
        message: error.message || "Syntax error"
      });
    }

    return diagnostics;
  }

  private extractVueScript(code: string): { content: string; offset: number } | null {
    const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    if (!scriptMatch || !scriptMatch[1]) return null;

    const scriptStart = code.indexOf(scriptMatch[0]);
    const contentStart = scriptStart + scriptMatch[0].indexOf(scriptMatch[1]);
    
    return {
      content: scriptMatch[1],
      offset: contentStart
    };
  }

  private validateAST(ast: any, code: string, diagnostics: Diagnostic[], offset: number = 0) {
    const declaredVars = new Set<string>();
    const usedVars = new Set<string>();
    const constVars = new Map<string, any>(); // Store const variable nodes for position info

    // Walk the AST to collect variable declarations and usage
    walk(ast, {
      VariableDeclaration: (node: any) => {
        for (const declarator of node.declarations) {
          if (declarator.id.type === 'Identifier') {
            const varName = declarator.id.name;
            declaredVars.add(varName);
            
            if (node.kind === 'const') {
              constVars.set(varName, declarator.id);
            }
          }
        }
      },

      FunctionDeclaration: (node: any) => {
        if (node.id && node.id.name) {
          declaredVars.add(node.id.name);
        }
      },

      Identifier: (node: any, ancestors: any[]) => {
        const parent = ancestors[ancestors.length - 2];
        
        // Skip if this identifier is being declared
        if (parent?.type === 'VariableDeclarator' && parent.id === node) return;
        if (parent?.type === 'FunctionDeclaration' && parent.id === node) return;
        if (parent?.type === 'Property' && parent.key === node && !parent.computed) return;
        if (parent?.type === 'AssignmentExpression' && parent.left === node) return; // Handle in AssignmentExpression
        
        usedVars.add(node.name);
      },

      AssignmentExpression: (node: any) => {
        if (node.left.type === 'Identifier') {
          const varName = node.left.name;
          
          // Check const reassignment
          if (constVars.has(varName)) {
            const pos = this.getNodePosition(code, node.left);
            diagnostics.push({
              from: offset + pos.start,
              to: offset + pos.end,
              severity: "error",
              message: `Assignment to constant variable '${varName}'`
            });
          }
        }
      },

      UpdateExpression: (node: any) => {
        // Handle ++var, --var, var++, var--
        if (node.argument.type === 'Identifier') {
          const varName = node.argument.name;
          
          if (constVars.has(varName)) {
            const pos = this.getNodePosition(code, node.argument);
            diagnostics.push({
              from: offset + pos.start,
              to: offset + pos.end,
              severity: "error",
              message: `Assignment to constant variable '${varName}'`
            });
          }
        }
      }
    });

    // Check for undefined variables
    for (const varName of usedVars) {
      if (!declaredVars.has(varName) && !this.globals[varName]) {
        // Find first usage position (simplified)
        const regex = new RegExp(`\\b${varName}\\b`);
        const match = code.match(regex);
        if (match && match.index !== undefined) {
          diagnostics.push({
            from: offset + match.index,
            to: offset + match.index + varName.length,
            severity: "error",
            message: `'${varName}' is not defined`
          });
        }
      }
    }
  }

  private getNodePosition(_code: string, node: any): { start: number; end: number } {
    return {
      start: node.start || 0,
      end: node.end || node.start || 0
    };
  }
}

// Factory function for CodeMirror
export function createAcornLinter(globals: Record<string, boolean> = {}) {
  const linter = new AcornLinter(globals);
  
  return (code: string, language: "javascript" | "vue" | "json" | "typescript" | "html" = "javascript") => {
    return linter.verify(code, { language, globals });
  };
}