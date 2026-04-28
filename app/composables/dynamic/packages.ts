const PERF_ENABLED =
  typeof window !== "undefined" &&
  typeof URLSearchParams !== "undefined" &&
  new URLSearchParams(window.location.search).get("perf") === "1";

const loadingPackages = new Map<string, Promise<any>>();
let versionCache: Map<string, string> | null = null;

export function getGlobalNameForPackage(packageName: string): string {
  return packageName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/^(\d)/, "_$1");
}

function getPackageAliases(packageName: string): string[] {
  const safeName = packageName.replace(/[^a-zA-Z0-9]/g, "_");
  return safeName === packageName ? [packageName] : [packageName, safeName];
}

function getPackageFromObject(
  packagesObject: Record<string, any>,
  packageName: string,
): any {
  for (const alias of getPackageAliases(packageName)) {
    if (packagesObject[alias] !== undefined) return packagesObject[alias];
  }
  return undefined;
}

function setPackageOnObject(
  packagesObject: Record<string, any>,
  packageName: string,
  value: any,
): void {
  if (typeof window !== "undefined" && !(window as any).packages) {
    (window as any).packages = packagesObject;
  }
  for (const alias of getPackageAliases(packageName)) {
    packagesObject[alias] = value;
    if (typeof window !== "undefined") {
      (window as any).packages[alias] = value;
    }
  }
}

function deletePackageFromObject(
  packagesObject: Record<string, any>,
  packageName: string,
): void {
  for (const alias of getPackageAliases(packageName)) {
    delete packagesObject[alias];
    if (typeof window !== "undefined" && (window as any).packages) {
      delete (window as any).packages[alias];
    }
  }
}

function getLoadedExternalNames(
  packagesObject: Record<string, any>,
  versionMap: Map<string, string>,
): string[] {
  return [...versionMap.keys()].filter((packageName) => {
    const value = getPackageFromObject(packagesObject, packageName);
    return value !== undefined && value !== null;
  });
}

function normalizePackageToken(token: string): string {
  const [withoutTsAlias] = token.trim().split(/\s+as\s+/);
  const [withoutJsAlias] = (withoutTsAlias || "").split(":");
  return (withoutJsAlias || "")
    .trim()
    .replace(/^\.\.\./, "")
    .replace(/^['"]|['"]$/g, "");
}

async function fetchVersionMap(): Promise<Map<string, string>> {
  if (versionCache) return versionCache;
  try {
    const filter = JSON.stringify({ type: { _eq: "App" }, isEnabled: { _eq: true } });
    const res = await fetch(`/api/package_definition?filter=${encodeURIComponent(filter)}&fields=name,version`);
    if (!res.ok) return new Map();
    const data = await res.json();
    versionCache = new Map((data.data || []).map((p: any) => [p.name, p.version]));
    return versionCache;
  } catch {
    return new Map();
  }
}

export function invalidateVersionCache(): void {
  versionCache = null;
}

async function loadSinglePackage(
  packageName: string,
  packagesObject: Record<string, any>,
  loadedExternals: string[] = [],
): Promise<any> {
  if (loadingPackages.has(packageName)) {
    return loadingPackages.get(packageName)!;
  }

  const existingPackage = getPackageFromObject(packagesObject, packageName);
  if (existingPackage !== undefined) {
    return Promise.resolve(existingPackage);
  }

  const promise = (async () => {
    try {
      const versionMap = await fetchVersionMap();
      const version = versionMap.get(packageName);
      const versionParam = version ? `&version=${encodeURIComponent(version)}` : "";
      const externalsParam = loadedExternals.length > 0
        ? `&externals=${encodeURIComponent(JSON.stringify(loadedExternals))}`
        : "";

      const response = await fetch(
        `/api/packages?name=${encodeURIComponent(packageName)}${versionParam}${externalsParam}`,
        { cache: "no-cache" }
      );
      if (!response.ok) {
        throw new Error(`Failed to load package: ${response.statusText}`);
      }

      const code = await response.text();
      const moduleUrl = URL.createObjectURL(
        new Blob([code], { type: "application/javascript" })
      );
      const moduleResult = await import(/* @vite-ignore */ moduleUrl);
      URL.revokeObjectURL(moduleUrl);

      const executedResult =
        moduleResult.default !== undefined ? moduleResult.default : moduleResult;

      setPackageOnObject(packagesObject, packageName, executedResult);

      if (typeof window !== "undefined") {
        const globalName = getGlobalNameForPackage(packageName);
        const packageExports = moduleResult.default || moduleResult;
        (globalThis as any)[globalName] = packageExports;
        (window as any)[globalName] = packageExports;
      }

      return executedResult;
    } catch (err) {
      console.error(`[getPackages] Failed to load "${packageName}":`, err);
      setPackageOnObject(packagesObject, packageName, null);
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

  const arrayArgPattern = /getPackages\s*\(\s*\[([^\]]*)\]\s*\)/g;
  const arrayArgMatches = [...code.matchAll(arrayArgPattern)];
  for (const match of arrayArgMatches) {
    if (match[1]) {
      const items = match[1]
        .split(",")
        .map(normalizePackageToken)
        .filter(Boolean);
      packages.push(...items);
    }
  }

  const destructuringPattern = /const\s*\{([^}]+)\}\s*=\s*(?:await\s+)?getPackages\(\)/g;
  const destructuringMatches = [...code.matchAll(destructuringPattern)];
  for (const match of destructuringMatches) {
    if (match[1]) {
      const destructured = match[1];
      const items = destructured
        .split(",")
        .map(normalizePackageToken)
        .filter(Boolean);
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

  const invalidNames = new Set(["default", "ref", "loading", "value", "key", "vue"]);
  const importPattern =
    /\bimport\s+(?:type\s+)?(?:[\w*\s{},]*\s+from\s+)?["']([^"']+)["']/g;
  for (const match of code.matchAll(importPattern)) {
    if (/^import\s+type\b/.test(match[0].trim())) continue;
    if (match[1]) packages.push(match[1]);
  }
  const dynamicImportPattern = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of code.matchAll(dynamicImportPattern)) {
    if (match[1]) packages.push(match[1]);
  }

  const valid = (name: string) =>
    name.length > 0 &&
    !invalidNames.has(name) &&
    !name.startsWith(".") &&
    !name.startsWith("/") &&
    !name.startsWith("#") &&
    !name.startsWith("~") &&
    !name.startsWith("@/") &&
    !name.startsWith("~/") &&
    /^[@a-z0-9][\w./-]*$/.test(name);

  return [...new Set(packages)].filter(valid);
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

  const versionMap = await fetchVersionMap();
  const requestedPackageNames =
    packageNames && packageNames.length > 0
      ? packageNames
      : [...versionMap.keys()];

  const uniquePackageNames = [...new Set(requestedPackageNames)];
  const packagesToLoad = uniquePackageNames.filter(
    (pkgName: string) =>
      getPackageFromObject(packagesObject, pkgName) === undefined
  );

  const previouslyFailed = uniquePackageNames.filter(
    (pkgName: string) => getPackageFromObject(packagesObject, pkgName) === null
  );

  if (previouslyFailed.length > 0) {
    previouslyFailed.forEach((pkgName: string) => {
      deletePackageFromObject(packagesObject, pkgName);
      loadingPackages.delete(pkgName);
    });
    packagesToLoad.push(...previouslyFailed);
  }

  if (packagesToLoad.length === 0) {
    return packagesObject;
  }

  const loadStart = performance.now();

  for (const pkgName of packagesToLoad) {
    const loadedExternals = getLoadedExternalNames(packagesObject, versionMap)
      .filter((name) => name !== pkgName);
    await loadSinglePackage(pkgName, packagesObject, loadedExternals);
  }

  if (PERF_ENABLED) {
    console.log(
      `[Extension Perf] getPackages: load ${packagesToLoad.length} pkgs: ${(performance.now() - loadStart).toFixed(1)}ms`
    );
  }

  const failedPackages = packagesToLoad.filter(
    (pkgName) => {
      const value = getPackageFromObject(packagesObject, pkgName);
      return value === null || value === undefined;
    }
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
