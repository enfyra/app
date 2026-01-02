import { defineEventHandler, createError } from "h3";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
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

function getAllInstalledPackages(): Array<{ name: string; version: string; description?: string; dependencies?: Record<string, string> }> {
  const projectRoot = findProjectRoot();
  const packageJsonPath = join(projectRoot, 'package.json');
  const nodeModulesPath = join(projectRoot, 'node_modules');
  
  if (!existsSync(packageJsonPath)) {
    throw createError({
      statusCode: 404,
      message: "package.json not found",
    });
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const allDependencies = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  };

  const packages: Array<{ name: string; version: string; description?: string; dependencies?: Record<string, string> }> = [];

  // Lấy packages từ package.json
  for (const [name, version] of Object.entries(allDependencies)) {
    try {
      const packagePath = join(nodeModulesPath, name);
      const packageJsonPath = join(packagePath, 'package.json');
      
      if (existsSync(packageJsonPath)) {
        const pkgJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        packages.push({
          name,
          version: pkgJson.version || version as string,
          description: pkgJson.description,
          dependencies: {
            ...(pkgJson.dependencies || {}),
            ...(pkgJson.peerDependencies || {}),
          },
        });
      }
    } catch (error) {
      // Bỏ qua packages không đọc được
      console.warn(`Failed to read package info for ${name}:`, error);
    }
  }

  return packages;
}

export default defineEventHandler(async (event) => {
  try {
    const packages = getAllInstalledPackages();
    
    return {
      data: packages,
      meta: {
        totalCount: packages.length,
      },
    };
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    throw createError({
      statusCode,
      message: error.message || "Failed to get installed packages",
    });
  }
});

