import type { ExtensionDefinition } from "~/types/extensions";
import { EXTENSION_RUNTIME_FIELDS } from "~/utils/extension-fields";

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
let loadRunId = 0;

function getRecordId(extension: ExtensionDefinition): string | number | null {
  return extension.id ?? extension._id ?? null;
}

export function useGlobalExtensions() {
  const { loadDynamicComponent } = useDynamicComponent();

  const loadGlobalExtensions = async (options: { forceReload?: boolean; throwOnError?: boolean } = {}) => {
    if (!import.meta.client) return;

    const runId = ++loadRunId;
    globalExtensionsPending.value = true;
    globalExtensionsError.value = null;

    try {
      const response = await $fetch<{ data?: ExtensionDefinition[] }>("/api/enfyra_extension", {
        query: {
          fields: EXTENSION_RUNTIME_FIELDS,
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
          .filter((extension) => extension.extensionId)
          .map(async (extension) => {
            const component = await loadDynamicComponent(
              extension.compiledCode!,
              extension.extensionId!,
              extension.updatedAt,
              options.forceReload,
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

      if (runId === loadRunId) {
        globalExtensions.value = loaded;
      }
    } catch (error: any) {
      const message = error?.message || String(error);
      if (runId === loadRunId) {
        globalExtensionsError.value = message;
      }
      console.error("[Global extensions] Failed to load", error);
      if (options.throwOnError) {
        throw error;
      }
    } finally {
      if (runId === loadRunId) {
        globalExtensionsPending.value = false;
      }
    }
  };

  return {
    globalExtensions,
    globalExtensionsPending,
    globalExtensionsError,
    loadGlobalExtensions,
  };
}
