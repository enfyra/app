import { build, type Plugin } from 'esbuild';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

export interface ExternalPackage {
  name: string;
  globalName: string;
  exports: string[];
}

function createExternalPlugin(externals: ExternalPackage[]): Plugin {
  return {
    name: 'external-packages',
    setup(build) {
      for (const ext of externals) {
        build.onResolve({ filter: new RegExp(`^${ext.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }, (args) => {
          return {
            path: args.path,
            namespace: `external-${ext.name}`,
          };
        });

        build.onLoad({ filter: /.*/, namespace: `external-${ext.name}` }, () => {
          const exportsList = ext.exports.length > 0
            ? ext.exports.map(e => `  export const ${e} = pkg.${e};`).join('\n')
            : '  // No specific exports listed';

          return {
            contents: `
  const pkg = globalThis.${ext.globalName} || {};
${exportsList}
  export default pkg.default || pkg;
`,
            loader: 'js',
          };
        });
      }
    },
  };
}

const vueExternalPlugin: Plugin = {
  name: 'vue-external',
  setup(build) {
    build.onResolve({ filter: /^vue$/ }, (args) => {
      return {
        path: args.path,
        namespace: 'vue-external',
      };
    });

    build.onLoad({ filter: /.*/, namespace: 'vue-external' }, () => {
      return {
        contents: `
          export const version = globalThis.vueVersion || '3.5.25';
          export const ref = globalThis.ref;
          export const reactive = globalThis.reactive;
          export const computed = globalThis.computed;
          export const watch = globalThis.watch;
          export const watchEffect = globalThis.watchEffect;
          export const onMounted = globalThis.onMounted;
          export const onUnmounted = globalThis.onUnmounted;
          export const onBeforeMount = globalThis.onBeforeMount;
          export const onBeforeUnmount = globalThis.onBeforeUnmount;
          export const onUpdated = globalThis.onUpdated;
          export const onBeforeUpdate = globalThis.onBeforeUpdate;
          export const nextTick = globalThis.nextTick;
          export const resolveComponent = globalThis.resolveComponent;
          export const h = globalThis.h;
          export const defineComponent = globalThis.defineComponent;
          export const defineProps = globalThis.defineProps;
          export const defineEmits = globalThis.defineEmits;
          export const defineExpose = globalThis.defineExpose;
          export const toRef = globalThis.toRef;
          export const toRefs = globalThis.toRefs;
          export const unref = globalThis.unref;
          export const isRef = globalThis.isRef;
          export const shallowRef = globalThis.shallowRef;
          export const triggerRef = globalThis.triggerRef;
          export const customRef = globalThis.customRef;
          export const shallowReactive = globalThis.shallowReactive;
          export const readonly = globalThis.readonly;
          export const shallowReadonly = globalThis.shallowReadonly;
          export const isProxy = globalThis.isProxy;
          export const isReactive = globalThis.isReactive;
          export const isReadonly = globalThis.isReadonly;
          export const toRaw = globalThis.toRaw;
          export const markRaw = globalThis.markRaw;
          export const effectScope = globalThis.effectScope;
          export const getCurrentScope = globalThis.getCurrentScope;
          export const onScopeDispose = globalThis.onScopeDispose;
          export const Transition = globalThis.Transition;
          export const TransitionGroup = globalThis.TransitionGroup;
          export const KeepAlive = globalThis.KeepAlive;
          export const Teleport = globalThis.Teleport;
          export const Suspense = globalThis.Suspense;
        `,
        loader: 'js',
      };
    });
  },
};

function findProjectRoot(): string {
  let current = process.cwd();
  while (current !== '/' && current.length > 1) {
    if (existsSync(join(current, 'package.json')) && existsSync(join(current, 'node_modules'))) {
      return current;
    }
    current = resolve(current, '..');
  }
  return process.cwd();
}

export interface BundleOptions {
  packageName: string;
  exportName?: string;
  minify?: boolean;
  externalPackages?: ExternalPackage[];
}

export interface BundleResult {
  code: string;
  dependencies: string[];
  warnings: string[];
  exports?: string[];
}

export async function bundlePackage(options: BundleOptions): Promise<BundleResult> {
  const { packageName, exportName, minify = false, externalPackages = [] } = options;
  const projectRoot = findProjectRoot();
  const packagePath = join(projectRoot, 'node_modules', packageName);
  const packageJsonPath = join(packagePath, 'package.json');

  if (!existsSync(packageJsonPath)) {
    throw new Error(`Package "${packageName}" not found in node_modules`);
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  let mainFile: string | undefined;

  // Priority 1: exports (modern, supports conditional exports)
  if (packageJson.exports) {
    const exports = packageJson.exports;
    if (typeof exports === 'string') {
      mainFile = exports;
    } else if (exports['.']) {
      if (typeof exports['.'] === 'string') {
        mainFile = exports['.'];
      } else if (typeof exports['.'] === 'object') {
        mainFile = exports['.'].import || exports['.'].default || exports['.'].browser || exports['.'].require;
      }
    } else if (exports.import) {
      mainFile = exports.import;
    } else if (exports.default) {
      mainFile = exports.default;
    } else if (exports.browser) {
      mainFile = exports.browser;
    } else if (exports.require) {
      mainFile = exports.require;
    }
  }
  // Priority 2: module (ESM)
  else if (packageJson.module) {
    mainFile = packageJson.module;
  }
  // Priority 3: main (CJS)
  else if (packageJson.main) {
    mainFile = packageJson.main;
  }
  // Priority 4: browser (browser-specific)
  else if (packageJson.browser && typeof packageJson.browser === 'string') {
    mainFile = packageJson.browser;
  }
  // Priority 5: CDN bundles (UMD, fallback for browser)
  else if (packageJson.jsdelivr && typeof packageJson.jsdelivr === 'string') {
    mainFile = packageJson.jsdelivr;
  } else if (packageJson.unpkg && typeof packageJson.unpkg === 'string') {
    mainFile = packageJson.unpkg;
  }

  if (!mainFile) {
    mainFile = 'index.js';
  }

  const mainFilePath = join(packagePath, mainFile);

  if (!existsSync(mainFilePath)) {
    const fallbacks = [
      join(packagePath, 'index.js'),
      join(packagePath, 'index.mjs'),
      join(packagePath, 'src', 'index.js'),
      join(packagePath, 'dist', 'index.js'),
    ];

    for (const fallback of fallbacks) {
      if (existsSync(fallback)) {
        mainFile = fallback.replace(packagePath + '/', '');
        break;
      }
    }
  }

  const devDependencies = new Set(Object.keys(packageJson.devDependencies || {}));

  const originalDependencies: string[] = [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.peerDependencies || {}),
  ];

  const dependencies: string[] = [...originalDependencies];
  const warnings: string[] = [];

  const externalPlugin = createExternalPlugin(externalPackages);
  const allPlugins = externalPackages.length > 0
    ? [vueExternalPlugin, externalPlugin]
    : [vueExternalPlugin];

  try {
    const result = await build({
      entryPoints: [mainFilePath],
      bundle: true,
      splitting: false,
      platform: 'browser',
      format: 'esm',
      minify,
      write: false,
      logLevel: 'error',
      absWorkingDir: projectRoot,
      metafile: true,
      plugins: allPlugins,
    });

    if (!result.outputFiles || result.outputFiles.length === 0) {
      throw new Error('No output files generated from bundling');
    }

    const firstOutputFile = result.outputFiles[0];
    if (!firstOutputFile) {
      throw new Error('No output files generated from bundling');
    }

    let code = firstOutputFile.text;

    if (result.metafile && result.metafile.inputs) {
      for (const [path, entry] of Object.entries(result.metafile.inputs)) {
        if (path.includes('node_modules') && !path.includes(packageName)) {
          const depMatch = path.match(/node_modules\/([^\/]+)/);
          if (depMatch && depMatch[1] && !dependencies.includes(depMatch[1]) && !devDependencies.has(depMatch[1])) {
            dependencies.push(depMatch[1]);
          }
        }
      }
    }

    const exportMatch = code.match(/export\s*\{([\s\S]*?)\}/);
    const exportsList: string[] = [];

    if (exportMatch && exportMatch[1]) {
      const exportList = exportMatch[1];

      const exportItems = exportList.split(',').map(e => e.trim()).filter(Boolean);
      const defaultExports = exportItems.map(item => {
        const parts = item.split(/\s+as\s+/);
        if (parts.length === 2 && parts[0] && parts[1]) {
          return `${parts[1].trim()}: ${parts[0].trim()}`;
        }
        return item;
      });

      const defaultExportStr = defaultExports.join(',\n  ');

      code = code.replace(/export\s*\{[\s\S]*?\}/, '');
      code += `\nexport default {\n  ${defaultExportStr}\n};\n`;

      exportsList.push(...exportItems.map(e => e.replace(/\s+as\s+.+$/, '').trim()));
    }

    code = code.replace(/export\s+default\s+\{([\s\S]+?)\};/g, (match, content) => {
      const fixed = content.replace(/(\w+)\s+as\s+(\w+)/g, '$2: $1');
      return `export default {${fixed}};`;
    });

    const allDependencies = [...new Set([...originalDependencies, ...dependencies])];

    return {
      code,
      dependencies: allDependencies,
      warnings,
      exports: exportsList,
    };
  } catch (error: any) {
    if (error.errors) {
      const nodeBuiltins = error.errors
        .filter((e: any) => e.text.includes('node built-in'))
        .map((e: any) => e.text.match(/"([^"]+)"/)?.[1])
        .filter(Boolean);

      if (nodeBuiltins.length > 0) {
        warnings.push(`Package uses Node.js built-ins: ${nodeBuiltins.join(', ')}`);
      }
    }

    try {
      const fallbackResult = await build({
        entryPoints: [mainFilePath],
        bundle: true,
        splitting: false,
        platform: 'browser',
        format: 'esm',
        minify,
        write: false,
        logLevel: 'silent',
        absWorkingDir: projectRoot,
        inject: [join(projectRoot, 'app/server/utils/shims.js')],
        plugins: allPlugins,
      });

      if (!fallbackResult.outputFiles || fallbackResult.outputFiles.length === 0) {
        throw new Error('No output files generated from fallback bundling');
      }

      const firstFallbackOutputFile = fallbackResult.outputFiles[0];
      if (!firstFallbackOutputFile) {
        throw new Error('No output files generated from fallback bundling');
      }

      let fallbackCode = firstFallbackOutputFile.text;
      const exportMatch = fallbackCode.match(/export\s*\{([\s\S]*?)\}/);
      const exportsList: string[] = [];

      if (exportMatch && exportMatch[1]) {
        const exportList = exportMatch[1];

        const exportItems = exportList.split(',').map(e => e.trim()).filter(Boolean);
        const defaultExports = exportItems.map(item => {
          const parts = item.split(/\s+as\s+/);
          if (parts.length === 2 && parts[0] && parts[1]) {
            return `${parts[1].trim()}: ${parts[0].trim()}`;
          }
          return item;
        });

        const defaultExportStr = defaultExports.join(',\n  ');

        fallbackCode = fallbackCode.replace(/export\s*\{[\s\S]*?\}/, '');
        fallbackCode += `\nexport default {\n  ${defaultExportStr}\n};\n`;

        exportsList.push(...exportItems.map(e => e.replace(/\s+as\s+.+$/, '').trim()));
      }

      fallbackCode = fallbackCode.replace(/export\s+default\s+\{([\s\S]+?)\};/g, (match, content) => {
        const fixed = content.replace(/(\w+)\s+as\s+(\w+)/g, '$2: $1');
        return `export default {${fixed}};`;
      });

      const allDependencies = [...new Set([...originalDependencies, ...dependencies])];

      return {
        code: fallbackCode,
        dependencies: allDependencies,
        warnings: [...warnings, 'Bundled with Node.js shims (may have limited functionality)'],
        exports: exportsList,
      };
    } catch {
      throw new Error(`Failed to bundle package "${packageName}": ${error.message || 'Unknown error'}`);
    }
  }
}
