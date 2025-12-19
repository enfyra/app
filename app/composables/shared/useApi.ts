import { ref, unref, toRaw } from "vue";
// import { $fetch } from "~/utils/api/http";
import { getAppUrl, normalizeUrl } from "~/utils/api/url";

const ENFYRA_API_PREFIX = "/api";

interface ApiError {
  message: string;
  status?: number;
  data?: any;
  response?: any;
}

interface ExecuteOptions {
  id?: string | number;
  ids?: (string | number)[];
  body?: any;
  query?: any;
  files?: FormData[];
  batchSize?: number;
  concurrent?: number;
  onProgress?: (progress: any) => void;
}

function handleError(
  error: any,
  context?: string,
  customHandler?: (error: ApiError, context?: string) => void
): ApiError {
  const apiError: ApiError = {
    message: error?.message || error?.data?.message || error?.response?.data?.message || "Request failed",
    status: error?.status || error?.response?.status,
    data: error?.data || error?.response?.data,
    response: error?.response || error,
  };

  if (customHandler) {
    customHandler(apiError, context);
  } else {
    console.error(`[API Error]`, { error: apiError, context });
  }

  return apiError;
}

export function useApi<T = any>(url: string | (() => string), options: any = {}) {
  const toast = useToast();
  const { method = "get", body, query, errorContext, onError } = options;
  
  const data = ref<T | null>(null);
  const error = ref<ApiError | null>(null);
  const pending = ref(false);
  const status = ref<string>("idle");

  const execute = async (executeOpts?: ExecuteOptions) => {
    pending.value = true;
    error.value = null;
    status.value = "pending";

    try {
      const config: any = useRuntimeConfig().public.enfyraSDK;
      const apiUrl = getAppUrl();
      const apiPrefix = config?.apiPrefix || ENFYRA_API_PREFIX;
      const basePath = (typeof url === "function" ? url() : url)
        .replace(/^\/?api\/?/, "")
        .replace(/^\/+/, "");
      const finalBody = executeOpts?.body || unref(body);
      const finalQuery = executeOpts?.query || unref(query);

      const isBatchOperation =
        !options.disableBatch &&
        ((executeOpts?.ids &&
          executeOpts.ids.length > 0 &&
          (method.toLowerCase() === "patch" ||
            method.toLowerCase() === "delete")) ||
          (method.toLowerCase() === "post" &&
            executeOpts?.files &&
            Array.isArray(executeOpts.files) &&
            executeOpts.files.length > 0));

      const buildPath = (...segments: (string | number)[]): string => {
        return segments.filter(Boolean).join("/");
      };

      const fullBaseURL = normalizeUrl(apiUrl, apiPrefix);
      // Handle batch file upload
      if (
        isBatchOperation &&
        executeOpts?.files &&
        Array.isArray(executeOpts.files) &&
        executeOpts.files.length > 0
      ) {
        const responses = await Promise.all(
          executeOpts.files.map(async (fileObj: FormData) => {
            return $fetch<T>(basePath, {
              baseURL: fullBaseURL,
              method: method as any,
              body: fileObj,
              headers: options.headers,
              query: finalQuery,
            });
          })
        );

        data.value = responses as T;
        status.value = "success";
        return responses;
      }

      // Handle batch operations with ids
      if (isBatchOperation && executeOpts?.ids && executeOpts.ids.length > 0) {
        const responses = await Promise.all(
          executeOpts.ids.map(async (id) => {
            const finalPath = buildPath(basePath, id);
            return $fetch<T>(finalPath, {
              baseURL: fullBaseURL,
              method: method as any,
              body: finalBody ? toRaw(finalBody) : undefined,
              headers: options.headers,
              query: finalQuery,
            });
          })
        );

        data.value = responses as T;
        status.value = "success";
        return responses;
      }

      const finalPath = executeOpts?.id
        ? buildPath(basePath, executeOpts.id)
        : basePath;

      const response = await $fetch<T>(finalPath, {
        baseURL: fullBaseURL,
        method: method as any,
        body: finalBody ? toRaw(finalBody) : undefined,
        headers: options.headers,
        query: finalQuery,
      });

      data.value = response;
      status.value = "success";
      return response;
    } catch (err) {
      const apiError = handleError(err, errorContext, (error, context) => {
        const errorMessage = error?.data?.message || error?.message || "An error occurred";
        
        toast.add({
          title: "Error",
          description: errorMessage,
          color: "error",
        });

        if (onError) {
          onError(error, context);
        }
      });
      error.value = apiError;
      status.value = "error";
      return null;
    } finally {
      pending.value = false;
    }
  };

  const refresh = () => {
    return execute();
  };

  return {
    data,
    error,
    pending,
    refresh,
    execute,
    status,
  };
}
