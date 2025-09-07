import type { Diagnostic } from "@codemirror/lint";

export interface SimpleLintResult {
  diagnostics: Diagnostic[];
}

/**
 * Lightweight syntax checker for Vue SFC
 * Much smaller than ESLint browserify (13MB)
 */
export function createSimpleLinter() {
  return {
    // Basic Vue SFC validation
    validateVueSFC(code: string): SimpleLintResult {
      const diagnostics: Diagnostic[] = [];
      
      // Check for balanced template tags
      const templateMatches = code.match(/<template[^>]*>/g);
      const templateCloseMatches = code.match(/<\/template>/g);
      
      if (templateMatches && templateCloseMatches) {
        if (templateMatches.length !== templateCloseMatches.length) {
          diagnostics.push({
            from: 0,
            to: code.length,
            severity: "error",
            message: "Unbalanced template tags"
          });
        }
      }
      
      // Check for balanced script tags
      const scriptMatches = code.match(/<script[^>]*>/g);
      const scriptCloseMatches = code.match(/<\/script>/g);
      
      if (scriptMatches && scriptCloseMatches) {
        if (scriptMatches.length !== scriptCloseMatches.length) {
          diagnostics.push({
            from: 0,
            to: code.length,
            severity: "error", 
            message: "Unbalanced script tags"
          });
        }
      }
      
      // Check for export default
      if (code.includes('<script') && !code.includes('export default')) {
        const scriptStart = code.indexOf('<script');
        diagnostics.push({
          from: scriptStart,
          to: scriptStart + 50,
          severity: "warning",
          message: "Vue component should have 'export default'"
        });
      }
      
      return { diagnostics };
    },
    
    // Basic JavaScript validation using try/catch
    validateJavaScript(code: string): SimpleLintResult {
      const diagnostics: Diagnostic[] = [];
      
      try {
        // Basic syntax check with Function constructor
        new Function(code);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Syntax error';
        diagnostics.push({
          from: 0,
          to: code.length,
          severity: "error",
          message: errorMessage
        });
      }
      
      // Check for common issues
      if (code.includes('const ') && code.includes('const ')) {
        // Check for const reassignment (simple regex)
        const constPattern = /const\s+(\w+)/g;
        const assignPattern = /(\w+)\s*=/g;
        
        let constMatch;
        const constVars = new Set<string>();
        
        while ((constMatch = constPattern.exec(code)) !== null) {
          constVars.add(constMatch[1] || '');
        }
        
        let assignMatch;
        while ((assignMatch = assignPattern.exec(code)) !== null) {
          if (constVars.has(assignMatch[1] || '')) {
            const pos = assignMatch.index || 0;
            diagnostics.push({
              from: pos,
              to: pos + assignMatch[0].length,
              severity: "error",
              message: `Assignment to constant variable: ${assignMatch[1]}`
            });
          }
        }
      }
      
      return { diagnostics };
    }
  };
}