type PackageRegistry = Record<string, any>;

const aliasOwners = new WeakMap<PackageRegistry, Map<string, string>>();

function getPackageAliases(packageName: string) {
  const safeName = packageName.replace(/[^a-zA-Z0-9]/g, "_");
  return safeName === packageName ? [packageName] : [packageName, safeName];
}

function getAliasOwners(registry: PackageRegistry) {
  let owners = aliasOwners.get(registry);
  if (!owners) {
    owners = new Map();
    aliasOwners.set(registry, owners);
  }
  return owners;
}

export function createPackageRegistry(source?: PackageRegistry) {
  return Object.assign(Object.create(null), source || {}) as PackageRegistry;
}

export function getCanonicalPackage(
  registry: PackageRegistry,
  packageName: string,
) {
  return Object.hasOwn(registry, packageName)
    ? registry[packageName]
    : undefined;
}

export function assertPackageAliasesAvailable(
  registry: PackageRegistry,
  packageName: string,
) {
  const owners = getAliasOwners(registry);
  for (const alias of getPackageAliases(packageName)) {
    const owner = owners.get(alias);
    if (owner && owner !== packageName) {
      throw new Error(
        `Package alias collision: "${packageName}" and "${owner}" both map to "${alias}"`,
      );
    }
    if (
      alias !== packageName &&
      Object.hasOwn(registry, alias) &&
      !Object.hasOwn(registry, packageName)
    ) {
      throw new Error(
        `Package alias collision: "${packageName}" maps to existing key "${alias}"`,
      );
    }
  }
}

export function setPackageValue(
  registry: PackageRegistry,
  packageName: string,
  value: any,
) {
  assertPackageAliasesAvailable(registry, packageName);
  const owners = getAliasOwners(registry);
  for (const alias of getPackageAliases(packageName)) {
    registry[alias] = value;
    owners.set(alias, packageName);
  }
}

export function deletePackageValue(
  registry: PackageRegistry,
  packageName: string,
) {
  const owners = getAliasOwners(registry);
  for (const alias of getPackageAliases(packageName)) {
    const owner = owners.get(alias);
    if (alias === packageName || owner === packageName) {
      delete registry[alias];
      owners.delete(alias);
    }
  }
}
