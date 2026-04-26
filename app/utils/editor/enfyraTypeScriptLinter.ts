import type { Diagnostic } from '@codemirror/lint';

type TypeScriptModule = typeof import('typescript');

interface TransformedCode {
  code: string;
  sourceMap: number[];
}

const macroReplacements = new Map([
  ['@CACHE', '$ctx.$cache'],
  ['@REPOS', '$ctx.$repos'],
  ['@HELPERS', '$ctx.$helpers'],
  ['@FETCH', '$ctx.$helpers.$fetch'],
  ['@LOGS', '$ctx.$logs'],
  ['@BODY', '$ctx.$body'],
  ['@DATA', '$ctx.$data'],
  ['@PARAMS', '$ctx.$params'],
  ['@QUERY', '$ctx.$query'],
  ['@USER', '$ctx.$user'],
  ['@REQ', '$ctx.$req'],
  ['@RES', '$ctx.$res'],
  ['@SHARE', '$ctx.$share'],
  ['@API', '$ctx.$api'],
  ['@UPLOADED_FILE', '$ctx.$uploadedFile'],
  ['@PKGS', '$ctx.$pkgs'],
  ['@SOCKET', '$ctx.$socket'],
  ['@TRIGGER', '$ctx.$trigger'],
  ['@FLOW', '$ctx.$flow'],
  ['@FLOW_PAYLOAD', '$ctx.$flow.$payload'],
  ['@FLOW_LAST', '$ctx.$flow.$last'],
  ['@FLOW_META', '$ctx.$flow.$meta'],
  ['@THROW400', "$ctx.$throw['400']"],
  ['@THROW401', "$ctx.$throw['401']"],
  ['@THROW403', "$ctx.$throw['403']"],
  ['@THROW404', "$ctx.$throw['404']"],
  ['@THROW409', "$ctx.$throw['409']"],
  ['@THROW422', "$ctx.$throw['422']"],
  ['@THROW429', "$ctx.$throw['429']"],
  ['@THROW500', "$ctx.$throw['500']"],
  ['@THROW503', "$ctx.$throw['503']"],
  ['@THROW', '$ctx.$throw'],
  ['@ERROR', '$ctx.$error'],
  ['@STATUS', '$ctx.$statusCode'],
]);

const libSource = `
interface Array<T> { length: number; [n: number]: T; }
interface Boolean {}
interface CallableFunction {}
interface Function {}
interface IArguments {}
interface NewableFunction {}
interface Number {}
interface Object {}
interface RegExp {}
interface String {}
interface PromiseLike<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>;
}
interface Promise<T> extends PromiseLike<T> {}
interface PromiseConstructor {
  new <T>(executor: (resolve: (value: T | Promise<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;
  resolve<T>(value: T | Promise<T>): Promise<T>;
}
declare const Promise: PromiseConstructor;
type PropertyKey = string | number | symbol;
type Record<K extends PropertyKey, T> = { [P in K]: T };
type Partial<T> = { [P in keyof T]?: T[P] };
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
type Awaited<T> = T extends Promise<infer U> ? U : T;
type EnfyraRepository = {
  find(args?: any): Promise<any[]>;
  findOne(args?: any): Promise<any>;
  create(args?: any): Promise<any>;
  update(args?: any): Promise<any>;
  delete(args?: any): Promise<any>;
  count(args?: any): Promise<number>;
  aggregate(args?: any): Promise<any>;
  [key: string]: any;
};
type EnfyraThrow = {
  (statusCode: number, message?: string): never;
  400(message: string): never;
  401(message?: string): never;
  403(message?: string): never;
  404(resource: string, id?: any): never;
  409(resource: string, field: string, value: any): never;
  422(message: string, details?: any): never;
  429(limit: number, window: string): never;
  500(message: string, details?: any): never;
  503(service: string): never;
  [statusCode: string]: (...args: any[]) => never;
};
type EnfyraContext = {
  $body: any;
  $data: any;
  $params: Record<string, any>;
  $query: Record<string, any>;
  $user: any;
  $req: any;
  $res: any;
  $share: Record<string, any>;
  $api: any;
  $uploadedFile: any;
  $pkgs: Record<string, any>;
  $cache: Record<string, any>;
  $repos: Record<string, EnfyraRepository>;
  $helpers: Record<string, any> & { $fetch: (...args: any[]) => Promise<any> };
  $logs: (...args: any[]) => any;
  $socket: Record<string, any>;
  $trigger: (...args: any[]) => Promise<any>;
  $flow: { $payload: any; $last: any; $meta: any; [key: string]: any };
  $throw: EnfyraThrow;
  $error: any;
  $statusCode: number;
  [key: string]: any;
};
declare const $ctx: EnfyraContext;
declare const console: { log(...args: any[]): void; warn(...args: any[]): void; error(...args: any[]): void; };
declare function setTimeout(handler: (...args: any[]) => void, timeout?: number): number;
declare function clearTimeout(id: number): void;
declare function setInterval(handler: (...args: any[]) => void, timeout?: number): number;
declare function clearInterval(id: number): void;
declare const window: any;
declare const document: any;
declare const packages: Record<string, any>;
declare function ref<T = any>(value?: T): any;
declare function reactive<T extends object>(value: T): T;
declare function computed<T = any>(getter: () => T): any;
declare function watch(...args: any[]): any;
declare function onMounted(fn: () => any): void;
declare function onUnmounted(fn: () => any): void;
declare function defineComponent(options: any): any;
declare function h(...args: any[]): any;
declare function useState(...args: any[]): any;
declare function useRoute(...args: any[]): any;
declare function useRouter(...args: any[]): any;
declare function useApi(...args: any[]): any;
declare function useToast(...args: any[]): any;
declare function useSchema(...args: any[]): any;
declare function useScreen(...args: any[]): any;
declare function useGlobalState(...args: any[]): any;
declare function usePermissions(...args: any[]): any;
declare function useFilterQuery(...args: any[]): any;
declare function useDataTableColumns(...args: any[]): any;
declare function useHeaderActionRegistry(...args: any[]): any;
declare function useSubHeaderActionRegistry(...args: any[]): any;
declare function usePageHeaderRegistry(...args: any[]): any;
declare function useConfirm(...args: any[]): any;
declare function useAuth(...args: any[]): any;
declare function useFetch(...args: any[]): any;
declare function useAsyncData(...args: any[]): any;
declare function useLazyFetch(...args: any[]): any;
declare function useHead(...args: any[]): any;
declare function useSeoMeta(...args: any[]): any;
declare function useCookie(...args: any[]): any;
declare function useNuxtApp(...args: any[]): any;
declare function navigateTo(...args: any[]): any;
declare function getPackages(packageNames?: string[]): Promise<Record<string, any>>;
declare module 'vue' {
  export const ref: typeof globalThis.ref;
  export const reactive: typeof globalThis.reactive;
  export const computed: typeof globalThis.computed;
  export const watch: typeof globalThis.watch;
  export const onMounted: typeof globalThis.onMounted;
  export const onUnmounted: typeof globalThis.onUnmounted;
  export const defineComponent: typeof globalThis.defineComponent;
  export const h: typeof globalThis.h;
}
`;

let typescriptModulePromise: Promise<TypeScriptModule> | null = null;

function loadTypeScript() {
  typescriptModulePromise ??= import('typescript');
  return typescriptModulePromise;
}

export function transformEnfyraCode(source: string): TransformedCode {
  const output: string[] = [];
  const sourceMap: number[] = [];
  const len = source.length;
  const CODE = 0;
  const STRING_DOUBLE = 1;
  const STRING_SINGLE = 2;
  const TEMPLATE = 3;
  const COMMENT_LINE = 4;
  const COMMENT_BLOCK = 5;
  let state = CODE;
  let pos = 0;
  let templateExprDepth = 0;
  let braceDepth = 0;

  const pushOriginal = (from: number, to: number) => {
    for (let index = from; index < to; index++) {
      output.push(source[index] || '');
      sourceMap.push(index);
    }
  };

  const pushReplacement = (replacement: string, originalFrom: number, originalTo: number) => {
    for (let index = 0; index < replacement.length; index++) {
      output.push(replacement[index] || '');
      sourceMap.push(Math.min(originalFrom + index, Math.max(originalFrom, originalTo - 1)));
    }
  };

  const isUpperMacroChar = (char: string) => /[A-Z0-9_]/.test(char);
  const isIdentifierStart = (char: string) => /[A-Za-z_]/.test(char);
  const isIdentifierChar = (char: string) => /[A-Za-z0-9_]/.test(char);

  while (pos < len) {
    const char = source[pos];
    const next = source[pos + 1];

    if (state === CODE) {
      if (char === '"') {
        pushOriginal(pos, pos + 1);
        state = STRING_DOUBLE;
        pos++;
      } else if (char === "'") {
        pushOriginal(pos, pos + 1);
        state = STRING_SINGLE;
        pos++;
      } else if (char === '`') {
        pushOriginal(pos, pos + 1);
        state = TEMPLATE;
        pos++;
      } else if (char === '/' && next === '/') {
        pushOriginal(pos, pos + 2);
        state = COMMENT_LINE;
        pos += 2;
      } else if (char === '/' && next === '*') {
        pushOriginal(pos, pos + 2);
        state = COMMENT_BLOCK;
        pos += 2;
      } else if (char === '@') {
        const start = pos;
        pos++;
        while (pos < len && isUpperMacroChar(source[pos] || '')) pos++;
        const token = source.slice(start, pos);
        const replacement = macroReplacements.get(token);
        if (replacement) {
          pushReplacement(replacement, start, pos);
        } else {
          pushOriginal(start, pos);
        }
      } else if (char === '#' || char === '%') {
        const start = pos;
        const registry = char === '#' ? '$ctx.$repos' : '$ctx.$pkgs';
        pos++;
        if (pos < len && isIdentifierStart(source[pos] || '')) {
          pos++;
          while (pos < len && isIdentifierChar(source[pos] || '')) pos++;
          pushReplacement(`${registry}.${source.slice(start + 1, pos)}`, start, pos);
        } else {
          pushOriginal(start, pos);
        }
      } else if (char === '{') {
        if (templateExprDepth > 0) braceDepth++;
        pushOriginal(pos, pos + 1);
        pos++;
      } else if (char === '}' && templateExprDepth > 0) {
        if (braceDepth > 0) {
          braceDepth--;
        } else {
          templateExprDepth--;
          state = TEMPLATE;
        }
        pushOriginal(pos, pos + 1);
        pos++;
      } else {
        pushOriginal(pos, pos + 1);
        pos++;
      }
    } else if (state === STRING_DOUBLE) {
      if (char === '\\') {
        pushOriginal(pos, Math.min(pos + 2, len));
        pos += 2;
      } else if (char === '"') {
        pushOriginal(pos, pos + 1);
        state = CODE;
        pos++;
      } else {
        pushOriginal(pos, pos + 1);
        pos++;
      }
    } else if (state === STRING_SINGLE) {
      if (char === '\\') {
        pushOriginal(pos, Math.min(pos + 2, len));
        pos += 2;
      } else if (char === "'") {
        pushOriginal(pos, pos + 1);
        state = CODE;
        pos++;
      } else {
        pushOriginal(pos, pos + 1);
        pos++;
      }
    } else if (state === TEMPLATE) {
      if (char === '\\') {
        pushOriginal(pos, Math.min(pos + 2, len));
        pos += 2;
      } else if (char === '`') {
        pushOriginal(pos, pos + 1);
        state = CODE;
        pos++;
      } else if (char === '$' && next === '{') {
        pushOriginal(pos, pos + 2);
        state = CODE;
        templateExprDepth++;
        braceDepth = 0;
        pos += 2;
      } else {
        pushOriginal(pos, pos + 1);
        pos++;
      }
    } else if (state === COMMENT_LINE) {
      if (char === '\n') {
        pushOriginal(pos, pos + 1);
        state = CODE;
        pos++;
      } else {
        pushOriginal(pos, pos + 1);
        pos++;
      }
    } else if (state === COMMENT_BLOCK) {
      if (char === '*' && next === '/') {
        pushOriginal(pos, pos + 2);
        state = CODE;
        pos += 2;
      } else {
        pushOriginal(pos, pos + 1);
        pos++;
      }
    }
  }

  return { code: output.join(''), sourceMap };
}

export async function lintEnfyraScript(
  source: string,
  language: 'javascript' | 'typescript' = 'typescript',
): Promise<Diagnostic[]> {
  const ts = await loadTypeScript();
  const transformed = transformEnfyraCode(source);
  const fileName =
    language === 'typescript' ? 'enfyra-script.ts' : 'enfyra-script.js';
  const libName = 'enfyra-lib.d.ts';
  const prefix = `${libSource}\nasync function __enfyra_runtime__() {\n`;
  const suffix = '\n}\n';
  const virtualSource = `${prefix}${transformed.code}${suffix}`;
  const virtualMap = [
    ...Array.from({ length: prefix.length }, () => -1),
    ...transformed.sourceMap,
    ...Array.from({ length: suffix.length }, () => -1),
  ];

  const compilerOptions: import('typescript').CompilerOptions = {
    allowJs: language === 'javascript',
    checkJs: language === 'javascript',
    noEmit: true,
    noLib: true,
    noImplicitAny: false,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  };

  const sourceFiles = new Map<string, string>([[fileName, virtualSource]]);

  const host: import('typescript').CompilerHost = {
    fileExists: (name) => sourceFiles.has(name),
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: () => '',
    getDefaultLibFileName: () => libName,
    getDirectories: () => [],
    getNewLine: () => '\n',
    getSourceFile: (name, languageVersion) => {
      const text = sourceFiles.get(name);
      return text === undefined ? undefined : ts.createSourceFile(name, text, languageVersion, true);
    },
    readFile: (name) => sourceFiles.get(name),
    useCaseSensitiveFileNames: () => true,
    writeFile: () => {},
  };

  const program = ts.createProgram([fileName], compilerOptions, host);
  const diagnostics = ts.getPreEmitDiagnostics(program, program.getSourceFile(fileName));

  return diagnostics
    .map((diagnostic): Diagnostic | null => {
      if (diagnostic.start === undefined || diagnostic.length === undefined) return null;
      const sourceStart = virtualMap[diagnostic.start];
      if (sourceStart === undefined || sourceStart < 0) return null;
      const virtualEnd = Math.max(diagnostic.start + diagnostic.length - 1, diagnostic.start);
      const sourceEnd = virtualMap[Math.min(virtualEnd, virtualMap.length - 1)];
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      return {
        from: sourceStart,
        to: sourceEnd !== undefined && sourceEnd >= sourceStart ? sourceEnd + 1 : sourceStart + 1,
        severity: diagnostic.category === ts.DiagnosticCategory.Warning ? 'warning' : 'error',
        message,
      };
    })
    .filter((diagnostic): diagnostic is Diagnostic => Boolean(diagnostic));
}

export async function validateEnfyraObjectReturnScript(
  source: string,
  language: 'javascript' | 'typescript' = 'typescript',
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = source.trim();
  if (!trimmed) return { ok: true };

  const ts = await loadTypeScript();
  const transformed = transformEnfyraCode(source);
  const fileName =
    language === 'typescript' ? 'enfyra-object-script.ts' : 'enfyra-object-script.js';
  const libName = 'enfyra-lib.d.ts';
  const prefix = `${libSource}
type __EnfyraPlainObject = { [key: string]: any } & { length?: never };
async function __enfyra_runtime__(): Promise<__EnfyraPlainObject> {
`;
  const suffix = `
}
`;
  const virtualSource = `${prefix}${transformed.code}${suffix}`;

  const compilerOptions: import('typescript').CompilerOptions = {
    allowJs: language === 'javascript',
    checkJs: language === 'javascript',
    noEmit: true,
    noLib: true,
    noImplicitAny: false,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  };

  const sourceFiles = new Map<string, string>([[fileName, virtualSource]]);

  const host: import('typescript').CompilerHost = {
    fileExists: (name) => sourceFiles.has(name),
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: () => '',
    getDefaultLibFileName: () => libName,
    getDirectories: () => [],
    getNewLine: () => '\n',
    getSourceFile: (name, languageVersion) => {
      const text = sourceFiles.get(name);
      return text === undefined ? undefined : ts.createSourceFile(name, text, languageVersion, true);
    },
    readFile: (name) => sourceFiles.get(name),
    useCaseSensitiveFileNames: () => true,
    writeFile: () => {},
  };

  const program = ts.createProgram([fileName], compilerOptions, host);
  const diagnostics = ts.getPreEmitDiagnostics(program, program.getSourceFile(fileName));
  const error = diagnostics.find((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);

  if (!error) return { ok: true };

  return {
    ok: false,
    message: ts.flattenDiagnosticMessageText(error.messageText, '\n'),
  };
}

export async function validateEnfyraRequiredReturnScript(
  source: string,
  language: 'javascript' | 'typescript' = 'typescript',
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = source.trim();
  if (!trimmed) {
    return { ok: false, message: 'Script must return a value.' };
  }

  const ts = await loadTypeScript();
  const transformed = transformEnfyraCode(source);
  const fileName =
    language === 'typescript' ? 'enfyra-return-script.ts' : 'enfyra-return-script.js';
  const libName = 'enfyra-lib.d.ts';
  const prefix = `${libSource}
type __EnfyraReturnValue = {} | null;
async function __enfyra_runtime__(): Promise<__EnfyraReturnValue> {
`;
  const suffix = `
}
`;
  const virtualSource = `${prefix}${transformed.code}${suffix}`;

  const compilerOptions: import('typescript').CompilerOptions = {
    allowJs: language === 'javascript',
    checkJs: language === 'javascript',
    noEmit: true,
    noLib: true,
    noImplicitAny: false,
    noImplicitReturns: true,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  };

  const sourceFiles = new Map<string, string>([[fileName, virtualSource]]);

  const host: import('typescript').CompilerHost = {
    fileExists: (name) => sourceFiles.has(name),
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: () => '',
    getDefaultLibFileName: () => libName,
    getDirectories: () => [],
    getNewLine: () => '\n',
    getSourceFile: (name, languageVersion) => {
      const text = sourceFiles.get(name);
      return text === undefined ? undefined : ts.createSourceFile(name, text, languageVersion, true);
    },
    readFile: (name) => sourceFiles.get(name),
    useCaseSensitiveFileNames: () => true,
    writeFile: () => {},
  };

  const program = ts.createProgram([fileName], compilerOptions, host);
  const diagnostics = ts.getPreEmitDiagnostics(program, program.getSourceFile(fileName));
  const error = diagnostics.find((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);

  if (!error) return { ok: true };

  return {
    ok: false,
    message: ts.flattenDiagnosticMessageText(error.messageText, '\n'),
  };
}

export async function validateEnfyraNoReturnScript(
  source: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = source.trim();
  if (!trimmed) return { ok: true };

  const ts = await loadTypeScript();
  const transformed = transformEnfyraCode(source);
  const sourceFile = ts.createSourceFile(
    'enfyra-no-return-script.ts',
    transformed.code,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  );

  const hasReturn = (node: import('typescript').Node): boolean => {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
    ) {
      return false;
    }

    if (ts.isReturnStatement(node)) {
      return true;
    }

    return node.getChildren(sourceFile).some(hasReturn);
  };

  if (!sourceFile.statements.some(hasReturn)) return { ok: true };

  return {
    ok: false,
    message: 'Post-hook scripts must update @DATA/$ctx.$data instead of returning a value.',
  };
}

export async function lintEnfyraTypeScript(source: string): Promise<Diagnostic[]> {
  return lintEnfyraScript(source, 'typescript');
}

interface VueScriptBlock {
  content: string;
  contentStart: number;
  language: 'javascript' | 'typescript';
  setup: boolean;
}

function parseVueScriptAttrs(attrs: string): Record<string, string | true> {
  const result: Record<string, string | true> = {};
  const attrRegex = /([A-Za-z_:][-A-Za-z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(attrs)) !== null) {
    result[match[1]] = match[2] ?? match[3] ?? match[4] ?? true;
  }
  return result;
}

function extractVueScriptBlocks(source: string): VueScriptBlock[] {
  const blocks: VueScriptBlock[] = [];
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(source)) !== null) {
    const attrs = parseVueScriptAttrs(match[1] || '');
    const language = attrs.lang === 'ts' || attrs.lang === 'typescript'
      ? 'typescript'
      : 'javascript';
    const fullMatch = match[0] || '';
    const openingTagEnd = fullMatch.indexOf('>') + 1;
    blocks.push({
      content: match[2] || '',
      contentStart: match.index + openingTagEnd,
      language,
      setup: attrs.setup === true || attrs.setup === '',
    });
  }

  return blocks;
}

async function lintVueScriptBlock(block: VueScriptBlock, index: number): Promise<Diagnostic[]> {
  const ts = await loadTypeScript();
  const transformed = transformEnfyraCode(block.content);
  const fileName = `extension-script-${index}.${block.language === 'typescript' ? 'ts' : 'js'}`;
  const libName = 'enfyra-vue-extension-lib.d.ts';
  const suffix = block.setup ? '\nexport {}' : '';
  const virtualSource = `${transformed.code}${suffix}`;
  const virtualMap = [
    ...transformed.sourceMap,
    ...Array.from({ length: suffix.length }, () => -1),
  ];

  const compilerOptions: import('typescript').CompilerOptions = {
    allowJs: block.language === 'javascript',
    checkJs: block.language === 'javascript',
    noEmit: true,
    noLib: true,
    noImplicitAny: false,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  };

  const sourceFiles = new Map<string, string>([
    [fileName, virtualSource],
    [libName, libSource],
  ]);

  const host: import('typescript').CompilerHost = {
    fileExists: (name) => sourceFiles.has(name),
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: () => '',
    getDefaultLibFileName: () => libName,
    getDirectories: () => [],
    getNewLine: () => '\n',
    getSourceFile: (name, languageVersion) => {
      const text = sourceFiles.get(name);
      return text === undefined ? undefined : ts.createSourceFile(name, text, languageVersion, true);
    },
    readFile: (name) => sourceFiles.get(name),
    useCaseSensitiveFileNames: () => true,
    writeFile: () => {},
  };

  const program = ts.createProgram([fileName, libName], compilerOptions, host);
  const diagnostics = ts.getPreEmitDiagnostics(program, program.getSourceFile(fileName));

  return diagnostics
    .map((diagnostic): Diagnostic | null => {
      if (diagnostic.start === undefined || diagnostic.length === undefined) return null;
      const sourceStart = virtualMap[diagnostic.start];
      if (sourceStart === undefined || sourceStart < 0) return null;
      const virtualEnd = Math.max(diagnostic.start + diagnostic.length - 1, diagnostic.start);
      const sourceEnd = virtualMap[Math.min(virtualEnd, virtualMap.length - 1)];
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      return {
        from: block.contentStart + sourceStart,
        to: block.contentStart + (sourceEnd !== undefined && sourceEnd >= sourceStart ? sourceEnd + 1 : sourceStart + 1),
        severity: diagnostic.category === ts.DiagnosticCategory.Warning ? 'warning' : 'error',
        message,
      };
    })
    .filter((diagnostic): diagnostic is Diagnostic => Boolean(diagnostic));
}

export async function lintVueSfcScripts(source: string): Promise<Diagnostic[]> {
  const blocks = extractVueScriptBlocks(source);
  if (blocks.length === 0) return [];
  const results = await Promise.all(blocks.map((block, index) => lintVueScriptBlock(block, index)));
  return results.flat();
}
