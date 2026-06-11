import { markRaw, defineComponent, onMounted, onUnmounted, h } from "vue";

import { availableComponents, getComposablesForPreview } from "./registry";
import { useExtensionPerf } from "./useExtensionPerf";
import { getPackages, detectPackages } from "./packages";
import {
  isComponentCached,
  getCachedComponent,
  setCachedComponent,
  clearCache,
  getCacheStats,
  getCachedExtensionMeta,
  setCachedExtensionMeta,
  extensionCacheInvalidation,
  invalidateExtensionCache,
  isExtensionInvalidationMatch,
  incrementCacheHits,
  incrementCacheMisses
} from "./cache";
import {
  setupVueGlobals,
  getVueRuntime,
  exposeVueGlobals,
  getComposablesObject,
  exposeComposables,
  exposeExtensionGlobalsToVueApp,
  setupPackagesGlobal,
  executeScriptInWindow,
  findComponentInWindow
} from "./runtime";
import type { PreviewState } from "./types";

const componentLoadPromises = new Map<string, Promise<any>>();

function buildComponentLoadKey(extensionName: string, updatedAt?: string | Date): string {
  return `${extensionName}:${updatedAt ? new Date(updatedAt).getTime() : "latest"}`;
}

function wrapWithCssLifecycle(
  component: any,
  extensionName: string,
): any {
  const extensionCss = component.__extensionCss;
  if (!extensionCss) return component;

  delete component.__extensionCss;

  return markRaw(
    defineComponent({
      name: `ExtCss_${extensionName}`,
      components: component.components,
      setup(_props, { attrs, slots }) {
        const styleId = `ext-style-${extensionName}`;

        onMounted(() => {
          if (!document.getElementById(styleId)) {
            const s = document.createElement("style");
            s.id = styleId;
            s.textContent = extensionCss;
            document.head.appendChild(s);
          }
        });

        onUnmounted(() => {
          document.getElementById(styleId)?.remove();
        });

        return () => h(component, attrs, slots);
      },
    })
  );
}

export const useDynamicComponent = () => {
  const perf = useExtensionPerf();
  const loadDynamicComponent = async (
    compiledCode: string,
    extensionName: string,
    updatedAt?: string | Date,
    forceReload = false,
    originalCode?: string
  ) => {
    try {
      if (typeof window === "undefined") {
        throw new Error("Extensions can only be loaded on client-side");
      }

      if (isComponentCached(extensionName, updatedAt) && !forceReload) {
        incrementCacheHits();
        return getCachedComponent(extensionName, updatedAt);
      }

      const loadKey = buildComponentLoadKey(extensionName, updatedAt);
      const pendingLoad = componentLoadPromises.get(loadKey);
      if (pendingLoad && !forceReload) {
        incrementCacheHits();
        return pendingLoad;
      }

      incrementCacheMisses();

      const loadPromise = (async () => {
        await Promise.all([setupVueGlobals(), getVueRuntime()]);

        const g = globalThis as any;
        const composables = getComposablesObject();
        exposeComposables(g, composables);
        exposeVueGlobals(g);
        exposeExtensionGlobalsToVueApp(useNuxtApp().vueApp, composables);

        setupPackagesGlobal(g);

        const requiredPackages = perf.timeSync("loadDynamic: detectPackages", () =>
          detectPackages(originalCode || compiledCode)
        );
        if (requiredPackages.length > 0) {
          await perf.time("loadDynamic: getPackages", () =>
            getPackages(requiredPackages)
          );
        }

        const component = await perf.time("loadDynamic: executeScript", () =>
          executeScriptInWindow(compiledCode, extensionName)
        );
        findComponentInWindow(extensionName);

        if (!component || typeof component !== "object") {
          throw new Error(`Invalid component: ${component}`);
        }

        const wrappedComponent = markRaw({
          ...component,
          components: availableComponents,
        });

        const finalComponent = wrapWithCssLifecycle(wrappedComponent, extensionName);
        setCachedComponent(extensionName, finalComponent, updatedAt);

        return finalComponent;
      })();

      componentLoadPromises.set(loadKey, loadPromise);

      try {
        return await loadPromise;
      } finally {
        componentLoadPromises.delete(loadKey);
      }
    } catch (error: any) {
      throw new Error(`Failed to load component: ${error?.message || error}`);
    }
  };

  const loadExtensionComponentPreview = async (
    compiledCode: string,
    extensionName: string,
    previewState?: PreviewState,
    originalCode?: string,
    options?: { onLoadingPhase?: (phase: "packages" | "executing") => void }
  ) => {
    try {
      if (typeof window === "undefined") {
        throw new Error("Extensions can only be loaded on client-side");
      }

      await Promise.all([setupVueGlobals(), getVueRuntime()]);

      const g = globalThis as any;
      exposeVueGlobals(g);

      const packagesObject: Record<string, any> = {};

      g.packages = packagesObject;
      if (typeof window !== "undefined") {
        (window as any).packages = packagesObject;
      }

      const codeForDetect = originalCode || compiledCode;
      if (codeForDetect) {
        const requiredPackages = perf.timeSync("preview: detectPackages", () =>
          detectPackages(codeForDetect)
        );
        if (requiredPackages.length > 0) {
          options?.onLoadingPhase?.("packages");
          await perf.time("preview: getPackages", () =>
            getPackages(requiredPackages)
          );
        }
      }

      setupPackagesGlobal(g);

      const composables = getComposablesForPreview(previewState);
      exposeComposables(g, composables);
      exposeExtensionGlobalsToVueApp(useNuxtApp().vueApp, composables);

      options?.onLoadingPhase?.("executing");
      const component = await perf.time("preview: executeScript", () =>
        executeScriptInWindow(compiledCode, extensionName)
      );
      findComponentInWindow(extensionName);

      if (typeof component !== "object" || component === null) {
        throw new Error(`Invalid component: ${typeof component}. Component must be an object.`);
      }

      const wrappedComponent = markRaw({
        ...component,
        components: availableComponents,
      });

      return wrapWithCssLifecycle(wrappedComponent, extensionName);
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
    extensionCacheInvalidation,
    invalidateExtensionCache,
    isExtensionInvalidationMatch,
  };
};
