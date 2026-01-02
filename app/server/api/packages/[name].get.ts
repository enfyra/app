import { defineEventHandler, getRouterParam, getQuery, createError } from "h3";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

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

function getPackageInfo(packageName: string): { code: string; packageJson: any; dependencies: Record<string, string> } {
  const projectRoot = findProjectRoot();
  const packagePath = join(projectRoot, 'node_modules', packageName);
  const packageJsonPath = join(packagePath, 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    throw createError({
      statusCode: 404,
      message: `Package "${packageName}" not found in node_modules`,
    });
  }
  
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  
  // Find main file - prioritize module, then main, then try exports
  let mainFile: string | undefined;
  
  // Priority 1: Browser-ready bundles (CDN fields)
  // This is crucial for dynamic loading in browser environment to avoid complex dependency resolution
  if (packageJson.unpkg && typeof packageJson.unpkg === 'string') {
    mainFile = packageJson.unpkg;
  } else if (packageJson.jsdelivr && typeof packageJson.jsdelivr === 'string') {
    mainFile = packageJson.jsdelivr;
  } else if (packageJson.browser && typeof packageJson.browser === 'string') {
    mainFile = packageJson.browser;
  } 
  // Priority 2: Modern ESM
  else if (packageJson.module) {
    mainFile = packageJson.module;
  } 
  // Priority 3: Standard Entry
  else if (packageJson.main) {
    mainFile = packageJson.main;
  } 
  // Priority 4: Exports map
  else if (packageJson.exports) {
    const exports = packageJson.exports;
    if (typeof exports === 'string') {
      mainFile = exports;
    } else if (exports['.']) {
      if (typeof exports['.'] === 'string') {
        mainFile = exports['.'];
      } else if (typeof exports['.'] === 'object') {
        mainFile = exports['.'].browser || exports['.'].default || exports['.'].import || exports['.'].require;
      }
    }
  }
  
  // Default fallback
  if (!mainFile) {
    mainFile = 'index.js';
  }
  
  // Resolve path relative to package directory
  const mainFilePath = join(packagePath, mainFile);
  
  if (!existsSync(mainFilePath)) {
    // Try common fallbacks
    const fallbacks = [
      join(packagePath, 'index.js'),
      join(packagePath, 'index.mjs'),
      join(packagePath, 'src', 'index.js'),
      join(packagePath, 'dist', 'index.js'),
    ];
    
    for (const fallback of fallbacks) {
      if (existsSync(fallback)) {
        return {
          code: readFileSync(fallback, 'utf-8'),
          packageJson,
          dependencies: {
            ...(packageJson.dependencies || {}),
            ...(packageJson.peerDependencies || {}),
          },
        };
      }
    }
    
    throw createError({
      statusCode: 404,
      message: `Main file "${mainFile}" not found for package "${packageName}"`,
    });
  }
  
  return {
    code: readFileSync(mainFilePath, 'utf-8'),
    packageJson,
    dependencies: {
      ...(packageJson.dependencies || {}),
      ...(packageJson.peerDependencies || {}),
    },
  };
}

export default defineEventHandler(async (event) => {
  try {
    let id: string | undefined;

    const url = new URL(event.node.req.url || '', `http://${event.node.req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    const pathMatch = pathname.match(/\/api\/packages\/(.+)$/);
    if (pathMatch) {
      id = pathMatch[1];
    } else {
      id = event.context.params?._ || getRouterParam(event, 'id') || getRouterParam(event, 'name');
    }

    if (!id) {
      throw createError({
        statusCode: 400,
        message: "Package name is required",
      });
    }

    const packageName = decodeURIComponent(id);
    const query = getQuery(event);
    const wantsJson = query.format === 'json';

    const packageInfo = getPackageInfo(packageName);

    if (wantsJson) {
      return {
        __type: 'module',
        __code: packageInfo.code,
        __source: 'node_modules',
        __packageJson: packageInfo.packageJson,
        __dependencies: Object.keys(packageInfo.dependencies),
      };
    }

    let code = packageInfo.code;
    let isCommonJS = code.includes('module.exports');

    if (isCommonJS) {
      code = `
(function() {
  var module = { exports: {} };
  var exports = module.exports;
  ${code}
  return module.exports;
})()
      `.trim();

      code = `export default ${code};`;
    }

    event.node.res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return code;
  } catch (error: any) {
    const statusCode = error.statusCode || (error.message?.includes('404') ? 404 : 500);
    throw createError({
      statusCode,
      message: error.message || "Failed to load package",
    });
  }
});
