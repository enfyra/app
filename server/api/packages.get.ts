import { defineEventHandler, getQuery, createError } from "h3";
import { bundlePackage, type ExternalPackage } from "../utils/package-bundler";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const packageName = query.name;

    if (!packageName || typeof packageName !== 'string') {
      throw createError({
        statusCode: 400,
        message: "Package name is required",
      });
    }

    const wantsJson = query.format === 'json';

    let externalPackages: ExternalPackage[] = [];
    if (query.externals) {
      try {
        externalPackages = JSON.parse(query.externals as string);
      } catch (e) {
        console.error('Failed to parse externals:', e);
      }
    }

    const { code, dependencies, warnings, exports } = await bundlePackage({
      packageName,
      minify: query.minify === 'true',
      externalPackages,
    });

    if (wantsJson) {
      return {
        __type: 'module',
        __code: code,
        __source: 'node_modules',
        __dependencies: dependencies,
        __warnings: warnings,
        __exports: exports,
      };
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




