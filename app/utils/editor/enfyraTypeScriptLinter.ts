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
interface Promise<T> {}
type PropertyKey = string | number | symbol;
type Record<K extends PropertyKey, T> = { [P in K]: T };
type Partial<T> = { [P in keyof T]?: T[P] };
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
`;

let typescriptModulePromise: Promise<TypeScriptModule> | null = null;

function loadTypeScript() {
  typescriptModulePromise ??= import('typescript');
  return typescriptModulePromise;
}

function transformEnfyraCode(source: string): TransformedCode {
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
        from: sourceStart,
        to: sourceEnd !== undefined && sourceEnd >= sourceStart ? sourceEnd + 1 : sourceStart + 1,
        severity: diagnostic.category === ts.DiagnosticCategory.Warning ? 'warning' : 'error',
        message,
      };
    })
    .filter((diagnostic): diagnostic is Diagnostic => Boolean(diagnostic));
}

export async function lintEnfyraTypeScript(source: string): Promise<Diagnostic[]> {
  return lintEnfyraScript(source, 'typescript');
}
