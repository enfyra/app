import { markRaw } from "vue";

import { availableComponents, getComposablesForPreview } from "./registry";
import { getPackages, detectPackages } from "./packages";
import {
  isComponentCached,
  getCachedComponent,
  setCachedComponent,
  clearCache,
  getCacheStats,
  getCachedExtensionMeta,
  setCachedExtensionMeta,
  incrementCacheHits,
  incrementCacheMisses
} from "./cache";
import {
  setupVueGlobals,
  getVueRuntime,
  exposeVueGlobals,
  getComposablesObject,
  exposeComposables,
  setupPackagesGlobal,
  executeScriptInWindow,
  findComponentInWindow
} from "./runtime";
import type { PreviewState } from "./types";

export const useDynamicComponent = () => {
  const loadDynamicComponent = async (
    compiledCode: string,
    extensionName: string,
    updatedAt?: string | Date,
    forceReload = false
  ) => {
    try {
      if (typeof window === "undefined") {
        throw new Error("Extensions can only be loaded on client-side");
      }

      if (isComponentCached(extensionName, updatedAt) && !forceReload) {
        incrementCacheHits();
        return getCachedComponent(extensionName, updatedAt);
      }

      incrementCacheMisses();

      await setupVueGlobals();

      const g = globalThis as any;
      const composables = getComposablesObject();

      exposeComposables(g, composables);

      await getVueRuntime();
      exposeVueGlobals(g);

      setupPackagesGlobal(g);

      const component = await executeScriptInWindow(compiledCode, extensionName);
      findComponentInWindow(extensionName);

      if (!component || typeof component !== "object") {
        throw new Error(`Invalid component: ${component}`);
      }

      const wrappedComponent = markRaw({
        ...component,
        components: availableComponents,
      });

      setCachedComponent(extensionName, wrappedComponent, updatedAt);

      return markRaw(wrappedComponent);
    } catch (error: any) {
      throw new Error(`Failed to load component: ${error?.message || error}`);
    }
  };

  const loadExtensionComponentPreview = async (
    compiledCode: string,
    extensionName: string,
    previewState?: PreviewState,
    originalCode?: string
  ) => {
    try {
      if (typeof window === "undefined") {
        throw new Error("Extensions can only be loaded on client-side");
      }

      await setupVueGlobals();

      const g = globalThis as any;
      await getVueRuntime();
      exposeVueGlobals(g);

      const packagesObject: Record<string, any> = {};

      g.packages = packagesObject;
      if (typeof window !== "undefined") {
        (window as any).packages = packagesObject;
      }

      if (originalCode) {
        const requiredPackages = detectPackages(originalCode);
        await getPackages(requiredPackages);
      }

      setupPackagesGlobal(g);

      const composables = getComposablesForPreview(previewState);
      exposeComposables(g, composables);

      const component = await executeScriptInWindow(compiledCode, extensionName);
      findComponentInWindow(extensionName);

      if (typeof component !== "object" || component === null) {
        throw new Error(`Invalid component: ${typeof component}. Component must be an object.`);
      }

      const wrappedComponent = markRaw({
        ...component,
        components: availableComponents,
      });

      return markRaw(wrappedComponent);
    } catch (error: any) {
      throw new Error(`Failed to load preview component: ${error?.message || error}`);
    }
  };

  return {
    loadDynamicComponent,
    loadExtensionComponentPreview,
    getPackages,
    clearCache,
    getCacheStats,
    isComponentCached,
    getCachedComponent,
    getCachedExtensionMeta,
    setCachedExtensionMeta,
  };
};
