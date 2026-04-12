interface ApiError {
  message: string;
  status?: number;
  statusMessage?: string;
  url?: string;
  data?: any;
  response?: any;
}

interface ExecuteOptions {
  id?: string | number;
  ids?: (string | number)[];
  body?: any;
  query?: any;
  headers?: Record<string, string>;
  files?: FormData[];
  batchSize?: number;
  concurrent?: number;
  onProgress?: (progress: any) => void;
}

function handleError(
  error: any,
  context?: string,
  customHandler?: (error: ApiError, context?: string) => void,
  requestMeta?: { method?: string; path?: string }
): ApiError {
  const status =
    error?.statusCode ??
    error?.status ??
    error?.response?.status;
  const statusMessage =
    error?.statusMessage ??
    error?.response?.statusText;
  const requestUrl =
    (typeof error?.request === "string" && error.request) ||
    (typeof error?.url === "string" && error.url) ||
    requestMeta?.path ||
    (typeof error?.response?.url === "string" && error.response.url);

  const data =
    error?.data ??
    error?.response?._data ??
    error?.response?.data;

  const dataMessage =
    data && typeof data === "object" && data !== null && "message" in data
      ? (data as { message?: unknown }).message
      : undefined;

  let message: string;
  const candidate =
    (typeof error?.message === "string" ? error.message : undefined) ??
    dataMessage ??
    (typeof data === "string" ? data : undefined) ??
    statusMessage;

  if (Array.isArray(candidate)) {
    message = candidate.join(". ");
  } else if (typeof candidate === "string" && candidate.length > 0) {
    message = candidate;
  } else if (candidate != null && typeof candidate !== "string") {
    message = String(candidate);
  } else {
    message = statusMessage || "Request failed";
  }

  const apiError: ApiError = {
    message,
    status,
    statusMessage,
    url: requestUrl,
    data,
    response: error?.response || error,
  };

  if (customHandler) {
    customHandler(apiError, context);
  } else {
    const ctx = context ? ` (${context})` : "";
    const method = requestMeta?.method
      ? ` ${String(requestMeta.method).toUpperCase()}`
      : "";
    const statusPart = status != null ? ` ${status}` : "";
    const smPart = statusMessage ? ` ${statusMessage}` : "";
    const urlPart = requestUrl ? ` ${requestUrl}` : "";
    console.error(`[API Error]${ctx}${method}${statusPart}${smPart}${urlPart}: ${message}`);
  }

  return apiError;
}

function shouldNavigateToErrorPage(apiError: ApiError): boolean {
  const s = apiError.status;
  if (s === 401) return false;
  if (s === 403 || s === 404) return true;
  if (s != null && s >= 500) return true;
  if (s == null) return true;
  return false;
}

export function useApi<T = any>(url: string | (() => string), options: any = {}) {
  const toast = useToast();
  const { method = "get", body, query, errorContext, onError, disableErrorPage } = options;

  const data = ref<T | null>(null);
  const error = ref<ApiError | null>(null);
  const pending = ref(false);
  const status = ref<string>("idle");

  const execute = async (executeOpts?: ExecuteOptions) => {
    pending.value = true;
    error.value = null;
    status.value = "pending";

    let lastAttemptedPath: string | undefined;

    try {
      const basePath = (typeof url === "function" ? url() : url)
        .replace(/^\/?api\/?/, "")
        .replace(/^\/+/, "");
      const finalBody = executeOpts?.body || unref(body);
      const finalQuery = executeOpts?.query || unref(query);
      const finalHeaders = {
        ...(options.headers || {}),
        ...(executeOpts?.headers || {}),
      };

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

      const finalPath = "/api/" + basePath;
      lastAttemptedPath = finalPath;

      // Handle batch file upload
      if (
        isBatchOperation &&
        executeOpts?.files &&
        Array.isArray(executeOpts.files) &&
        executeOpts.files.length > 0
      ) {
        const responses = await Promise.all(
          executeOpts.files.map(async (fileObj: FormData) => {
            lastAttemptedPath = finalPath;
            return $fetch(finalPath, {
              method: method as any,
              body: fileObj,
              headers: finalHeaders,
              query: finalQuery,
            }) as Promise<T>;
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
            const fullPath = buildPath(finalPath, id);
            lastAttemptedPath = fullPath;
            return $fetch<T>(fullPath, {
              method: method as any,
              body: finalBody ? toRaw(finalBody) : undefined,
              headers: finalHeaders,
              query: finalQuery,
            });
          })
        );

        data.value = responses as T;
        status.value = "success";
        return responses;
      }

      const fullPath = executeOpts?.id
        ? buildPath(finalPath, executeOpts.id)
        : finalPath;

      lastAttemptedPath = fullPath;

      const response = await $fetch<T>(fullPath, {
        method: method as any,
        body: finalBody ? toRaw(finalBody) : undefined,
        headers: finalHeaders,
        query: finalQuery,
      });

      data.value = response;
      status.value = "success";
      return response;
    } catch (err) {
      const apiError = handleError(err, errorContext, undefined, {
        method: String(method || "get"),
        path: lastAttemptedPath,
      });
      const handled = onError ? onError(apiError, errorContext) === true : false;
      if (!handled && apiError.status === 401 && import.meta.client) {
        window.location.reload();
        error.value = apiError;
        status.value = "error";
        return null;
      }
      if (
        !handled &&
        !disableErrorPage &&
        shouldNavigateToErrorPage(apiError)
      ) {
        const statusCode =
          apiError.status != null && apiError.status >= 400
            ? apiError.status
            : 503;
        const statusMessage =
          apiError.statusMessage ||
          apiError.message ||
          "Request failed";
        showError(
          createError({
            statusCode,
            statusMessage,
            message: errorContext
              ? `${errorContext}: ${apiError.message}`
              : apiError.message,
            data: {
              url: apiError.url,
              context: errorContext,
            },
          })
        );
        error.value = apiError;
        status.value = "error";
        return null;
      }
      if (!handled) {
        let errorMessage = apiError?.data?.message || apiError?.message || "An error occurred";
        if (Array.isArray(errorMessage)) {
          errorMessage = errorMessage.join(". ");
        }
        toast.add({
          title: "Error",
          description: errorMessage,
          color: "error",
        });
      }
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
