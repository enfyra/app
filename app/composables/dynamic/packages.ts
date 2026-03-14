import type { ExternalPackage } from "~/types/server";

const loadedPackages = new Map<string, { exports: string[]; globalName: string }>();
const loadingPackages = new Map<string, Promise<any>>();

export function getGlobalNameForPackage(packageName: string): string {
  return packageName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/^(\d)/, "_$1");
}

export function getExternalPackages(): ExternalPackage[] {
  const externals: ExternalPackage[] = [];
  for (const [name, meta] of loadedPackages.entries()) {
    externals.push({
      name,
      globalName: meta.globalName,
      exports: meta.exports,
    });
  }
  return externals;
}

interface PackageMetadataResponse {
  name: string;
  dependencies: string[];
  exports: string[];
}

async function fetchPackageMetadata(packageName: string): Promise<PackageMetadataResponse> {
  try {
    const response = await fetch(
      `/api/packages?name=${encodeURIComponent(packageName)}&format=json`
    );
    if (!response.ok) {
      return { name: packageName, dependencies: [], exports: [] };
    }

    const bundleData = await response.json();
    return {
      name: packageName,
      dependencies: bundleData.__dependencies || [],
      exports: bundleData.__exports || [],
    };
  } catch {
    return { name: packageName, dependencies: [], exports: [] };
  }
}

function topologicalSort(
  packages: string[],
  metadataMap: Map<string, PackageMetadataResponse>
): string[] {
  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (pkgName: string) => {
    if (visited.has(pkgName)) return;
    if (visiting.has(pkgName)) return;

    visiting.add(pkgName);

    const metadata = metadataMap.get(pkgName);
    if (metadata) {
      for (const dep of metadata.dependencies) {
        if (packages.includes(dep)) {
          visit(dep);
        }
      }
    }

    visiting.delete(pkgName);
    visited.add(pkgName);
    sorted.push(pkgName);
  };

  for (const pkg of packages) {
    visit(pkg);
  }

  return sorted;
}

async function loadSinglePackage(
  packageName: string,
  packagesObject: Record<string, any>,
  options: { useCacheBuster?: boolean; silent?: boolean } = {}
): Promise<any> {
  if (loadingPackages.has(packageName)) {
    return loadingPackages.get(packageName)!;
  }

  if (packagesObject[packageName] !== undefined) {
    return Promise.resolve(packagesObject[packageName]);
  }

  const promise = (async () => {
    try {
      const cacheBuster = options.useCacheBuster ? `&_=${Date.now()}` : "";

      const externals = getExternalPackages();
      const externalsParam =
        externals.length > 0
          ? `&externals=${encodeURIComponent(JSON.stringify(externals))}`
          : "";

      const response = await fetch(
        `/api/packages?name=${encodeURIComponent(packageName)}${cacheBuster}&format=json${externalsParam}`
      );
      if (!response.ok) {
        throw new Error(`Failed to load package: ${response.statusText}`);
      }

      const bundleData = await response.json();
      const { __code, __exports } = bundleData;

      const moduleUrl = URL.createObjectURL(
        new Blob([__code], { type: "application/javascript" })
      );
      const moduleResult = await import(/* @vite-ignore */ moduleUrl);
      URL.revokeObjectURL(moduleUrl);

      const executedResult =
        moduleResult.default !== undefined ? moduleResult.default : moduleResult;

      packagesObject[packageName] = executedResult;

      if (typeof window !== "undefined") {
        const globalName = getGlobalNameForPackage(packageName);
        const packageExports = moduleResult.default || moduleResult;
        (globalThis as any)[globalName] = packageExports;
        (window as any)[globalName] = packageExports;

        loadedPackages.set(packageName, {
          exports: __exports || Object.keys(packageExports),
          globalName,
        });
      }

      const safeName = packageName.replace(/[^a-zA-Z0-9]/g, "_");
      if (safeName !== packageName) {
        packagesObject[safeName] = executedResult;
      }

      if (typeof window !== "undefined") {
        (window as any).packages[packageName] = executedResult;
        if (safeName !== packageName) {
          (window as any).packages[safeName] = executedResult;
        }
      }

      return executedResult;
    } catch {
      packagesObject[packageName] = null;
      return null;
    } finally {
      loadingPackages.delete(packageName);
    }
  })();

  loadingPackages.set(packageName, promise);
  return promise;
}

export function detectPackages(code: string): string[] {
  const packages: string[] = [];

  const destructuringPattern = /const\s*\{([^}]+)\}\s*=\s*(?:await\s+)?getPackages\(\)/g;
  const destructuringMatches = [...code.matchAll(destructuringPattern)];
  for (const match of destructuringMatches) {
    if (match[1]) {
      const destructured = match[1];
      const items = destructured.split(",").map((s) => s.trim());
      packages.push(...items);
    }
  }

  const variablePattern = /const\s+(\w+)\s*=\s*(?:await\s+)?getPackages\(\)/;
  const variableMatch = code.match(variablePattern);
  if (variableMatch && variableMatch[1]) {
    const varName = variableMatch[1];

    const accessPattern = new RegExp(
      `${varName}\\[(['"])([\\w./-]+)\\1\\]|${varName}\\.([\\w-]+)`,
      "g"
    );
    const accessMatches = [...code.matchAll(accessPattern)];

    for (const match of accessMatches) {
      const quoted = match[2];
      const dotted = match[3];
      if (quoted) {
        packages.push(quoted);
      } else if (dotted) {
        packages.push(dotted);
      }
    }
  }

  return [...new Set(packages)];
}

export async function getPackages(packageNames?: string[]): Promise<Record<string, any>> {
  if (typeof window === "undefined") {
    throw new Error("Packages can only be loaded on client-side");
  }

  const g = globalThis as any;
  const packagesObject: Record<string, any> = g.packages || {};

  if (!g.packages) {
    g.packages = packagesObject;
    (window as any).packages = packagesObject;
  }

  if (!packageNames || packageNames.length === 0) {
    return packagesObject;
  }

  const uniquePackageNames = [...new Set(packageNames)];
  const packagesToLoad = uniquePackageNames.filter(
    (pkgName: string) =>
      packagesObject[pkgName] === undefined || packagesObject[pkgName] === null
  );

  if (packagesToLoad.length === 0) {
    return packagesObject;
  }

  const metadataMap = new Map<string, PackageMetadataResponse>();

  for (const pkgName of packagesToLoad) {
    const metadata = await fetchPackageMetadata(pkgName);
    metadataMap.set(pkgName, metadata);
  }

  const sortedPackages = topologicalSort(packagesToLoad, metadataMap);

  for (const pkgName of sortedPackages) {
    await loadSinglePackage(pkgName, packagesObject, { useCacheBuster: true, silent: true });
  }

  const failedPackages = sortedPackages.filter(
    (pkgName) => packagesObject[pkgName] === null || packagesObject[pkgName] === undefined
  );

  if (failedPackages.length > 0) {
    throw new Error(
      `Extension uses package(s) that are not installed: ${failedPackages.join(
        ", "
      )}. Please install these packages first.`
    );
  }

  g.packages = packagesObject;
  (window as any).packages = packagesObject;

  return packagesObject;
}
