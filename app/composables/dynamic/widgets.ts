import type { ExtensionDefinition } from "~/types/extensions";
import { EXTENSION_RUNTIME_FIELDS } from "~/utils/extension-fields";

type WidgetRequest = {
  id: string | number;
  resolve: (extension: ExtensionDefinition | null) => void;
  reject: (error: unknown) => void;
};

type WidgetQueue = {
  requests: Map<string, WidgetRequest[]>;
  values: Map<string, string | number>;
  scheduled: boolean;
};

const widgetQueues = new Map<string, WidgetQueue>();

function getWidgetMetaCacheKey(id: string | number): string {
  return `widget:${id}`;
}

function getQueue(idField: "id" | "_id"): WidgetQueue {
  const existing = widgetQueues.get(idField);
  if (existing) return existing;

  const queue: WidgetQueue = {
    requests: new Map(),
    values: new Map(),
    scheduled: false,
  };
  widgetQueues.set(idField, queue);
  return queue;
}

function getExtensionId(extension: ExtensionDefinition, idField: "id" | "_id"): string | null {
  const id = idField === "_id" ? extension._id ?? extension.id : extension.id ?? extension._id;
  return id == null ? null : String(id);
}

export function useDynamicWidgetLoader() {
  const { getIdFieldName } = useDatabase();
  const { getCachedExtensionMeta, setCachedExtensionMeta } = useDynamicComponent();

  const flushWidgetQueue = async (idField: "id" | "_id") => {
    const queue = getQueue(idField);
    const requests = queue.requests;
    const values = queue.values;
    queue.requests = new Map();
    queue.values = new Map();
    queue.scheduled = false;

    const ids = [...values.values()];
    if (ids.length === 0) return;

    try {
      const response = await $fetch<{ data?: ExtensionDefinition[] }>("/api/enfyra_extension", {
        query: {
          fields: EXTENSION_RUNTIME_FIELDS,
          filter: {
            _and: [
              { [idField]: { _in: ids } },
              { isEnabled: { _eq: true } },
              { type: { _eq: "widget" } },
            ],
          },
        },
      });

      const extensionsById = new Map<string, ExtensionDefinition>();
      for (const extension of response.data ?? []) {
        const extensionId = getExtensionId(extension, idField);
        if (extensionId) {
          extensionsById.set(extensionId, extension);
          setCachedExtensionMeta(getWidgetMetaCacheKey(extensionId), extension);
        }
      }

      for (const [id, pendingRequests] of requests) {
        const extension = extensionsById.get(id) ?? null;
        pendingRequests.forEach((request) => request.resolve(extension));
      }
    } catch (error) {
      for (const pendingRequests of requests.values()) {
        pendingRequests.forEach((request) => request.reject(error));
      }
    }
  };

  const loadWidgetExtension = (id: string | number): Promise<ExtensionDefinition | null> => {
    const cacheKey = getWidgetMetaCacheKey(id);
    const cachedMeta = getCachedExtensionMeta(cacheKey) as ExtensionDefinition | undefined;
    if (cachedMeta) {
      return Promise.resolve(cachedMeta);
    }

    const idField = getIdFieldName();
    const idKey = String(id);
    const queue = getQueue(idField);

    return new Promise((resolve, reject) => {
      const requests = queue.requests.get(idKey) ?? [];
      requests.push({ id, resolve, reject });
      queue.requests.set(idKey, requests);
      queue.values.set(idKey, id);

      if (!queue.scheduled) {
        queue.scheduled = true;
        Promise.resolve().then(() => flushWidgetQueue(idField));
      }
    });
  };

  return {
    getWidgetMetaCacheKey,
    loadWidgetExtension,
  };
}
