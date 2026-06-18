import type { ExtensionDefinition } from "~/types/extensions";

type GlobalExtensionRuntime = {
  key: string;
  id: string | number | null;
  extensionId: string;
  name: string;
  updatedAt?: string;
  component: any;
};

const globalExtensions = shallowRef<GlobalExtensionRuntime[]>([]);
const globalExtensionsPending = ref(false);
const globalExtensionsError = ref<string | null>(null);

function getRecordId(extension: ExtensionDefinition): string | number | null {
  return extension.id ?? extension._id ?? null;
}

export function useGlobalExtensions() {
  const { loadDynamicComponent } = useDynamicComponent();

  const loadGlobalExtensions = async (options: { forceReload?: boolean } = {}) => {
    if (!import.meta.client) return;

    globalExtensionsPending.value = true;
    globalExtensionsError.value = null;

    try {
      const response = await $fetch<{ data?: ExtensionDefinition[] }>("/api/enfyra_extension", {
        query: {
          fields: "*",
          limit: 0,
          sort: "id",
          filter: {
            _and: [
              { type: { _eq: "global" } },
              { isEnabled: { _eq: true } },
            ],
          },
        },
      });

      const loaded = await Promise.all(
        (response.data ?? [])
          .filter((extension) => extension.extensionId && (extension.compiledCode || extension.code))
          .map(async (extension) => {
            const component = await loadDynamicComponent(
              extension.compiledCode || extension.code,
              extension.extensionId!,
              extension.updatedAt,
              options.forceReload,
              extension.code,
            );
            const id = getRecordId(extension);
            return {
              key: `${extension.extensionId}:${extension.updatedAt ?? "latest"}`,
              id,
              extensionId: extension.extensionId!,
              name: extension.name,
              updatedAt: extension.updatedAt,
              component,
            };
          }),
      );

      globalExtensions.value = loaded;
    } catch (error: any) {
      globalExtensionsError.value = error?.message || String(error);
      console.error("[Global extensions] Failed to load", error);
    } finally {
      globalExtensionsPending.value = false;
    }
  };

  return {
    globalExtensions,
    globalExtensionsPending,
    globalExtensionsError,
    loadGlobalExtensions,
  };
}
