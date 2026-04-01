import { defineEventHandler, getQuery, createError } from "h3";

const cache = new Map<string, { code: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

const CDN_BASE = "https://esm.sh";

function toGlobalName(pkgName: string): string {
  return pkgName.replace(/[^a-zA-Z0-9]/g, "_").replace(/^(\d)/, "_$1");
}

function rewriteCdnPaths(code: string, cdnBase: string): string {
  return code.replace(/((?:from|import)\s*["'])\/([@a-z])/g, `$1${cdnBase}/$2`);
}

function replaceExternalImports(code: string, externals: string[]): string {
  for (const pkgName of externals) {
    const globalName = pkgName === "vue" ? "(globalThis.Vue || globalThis)" : `globalThis.${toGlobalName(pkgName)}`;
    const escaped = pkgName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    code = code.replace(
      new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*["']https://esm\\.sh/${escaped}@[^"']+["']\\s*;?`, "g"),
      (_match: string, imports: string) => {
        const pairs = imports.split(",").map((s: string) => s.trim()).filter(Boolean);
        const assignments = pairs.map((pair: string) => {
          const parts = pair.split(/\s+as\s+/);
          const original = (parts[0] || "").trim();
          const alias = (parts[1] || parts[0] || "").trim();
          return `${alias} = ${globalName}.${original}`;
        });
        return `const ${assignments.join(", ")};`;
      }
    );

    code = code.replace(
      new RegExp(`import\\s*["']https://esm\\.sh/${escaped}@[^"']+["']\\s*;?`, "g"),
      ""
    );
  }
  return code;
}

async function fetchBundle(cdnBase: string, spec: string, externals: string[]): Promise<string> {
  const entryUrl = `${cdnBase}/${spec}?bundle`;
  const entryRes = await fetch(entryUrl);
  if (!entryRes.ok) {
    throw createError({ statusCode: entryRes.status, message: `CDN error: ${entryRes.statusText}` });
  }

  let code = await entryRes.text();

  if (code.length < 1024) {
    const bundlePath = code.match(/export\s+(?:\*|\{[^}]*\})\s+from\s*["'](\/[^"']+)["']/);
    if (bundlePath?.[1]) {
      const bundleRes = await fetch(`${cdnBase}${bundlePath[1]}`);
      if (bundleRes.ok) {
        code = await bundleRes.text();
      }
    }
  }

  code = rewriteCdnPaths(code, cdnBase);
  code = replaceExternalImports(code, [...externals, "vue"]);

  return code;
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const packageName = query.name;

  if (!packageName || typeof packageName !== "string") {
    throw createError({
      statusCode: 400,
      message: "Package name is required",
    });
  }

  const version = typeof query.version === "string" ? query.version : undefined;
  const spec = version ? `${packageName}@${version}` : packageName;

  let externals: string[] = [];
  if (query.externals) {
    try {
      externals = JSON.parse(query.externals as string);
    } catch {}
  }

  const cacheKey = `${spec}:${externals.sort().join(",")}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    event.node.res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    event.node.res.setHeader("X-Cache", "HIT");
    return cached.code;
  }

  const code = await fetchBundle(CDN_BASE, spec, externals);
  cache.set(cacheKey, { code, timestamp: Date.now() });

  event.node.res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  event.node.res.setHeader("X-Cache", "MISS");
  return code;
});
