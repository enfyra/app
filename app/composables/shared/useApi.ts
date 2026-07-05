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

interface UploadProgressEvent {
  index: number;
  count: number;
  loaded: number;
  total: number;
  percent: number;
}

function appendQueryValue(searchParams: URLSearchParams, key: string, value: any) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((item) => appendQueryValue(searchParams, key, item));
    return;
  }
  if (typeof value === "object") {
    searchParams.append(key, JSON.stringify(value));
    return;
  }
  searchParams.append(key, String(value));
}

function buildRequestUrl(path: string, query?: Record<string, any>) {
  const url = new URL(path, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      appendQueryValue(url.searchParams, key, value);
    });
  }
  return url.toString();
}

function uploadFormDataWithProgress<T>(
  path: string,
  formData: FormData,
  options: {
    method: string;
    headers: Record<string, string>;
    query?: Record<string, any>;
    onProgress: (progress: UploadProgressEvent) => void;
    index: number;
    count: number;
  },
) {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method.toUpperCase(), buildRequestUrl(path, options.query), true);
    xhr.withCredentials = true;

    Object.entries(options.headers).forEach(([key, value]) => {
      if (key.toLowerCase() !== "content-type") {
        xhr.setRequestHeader(key, value);
      }
    });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      const percent = Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)));
      options.onProgress({
        index: options.index,
        count: options.count,
        loaded: event.loaded,
        total: event.total,
        percent,
      });
    };

    xhr.onload = () => {
      const responseText = xhr.responseText;
      let responseData: any = null;
      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        options.onProgress({
          index: options.index,
          count: options.count,
          loaded: 1,
          total: 1,
          percent: 100,
        });
        resolve(responseData as T);
        return;
      }
      reject({
        status: xhr.status,
        statusMessage: xhr.statusText,
        data: responseData,
        response: xhr,
      });
    };

    xhr.onerror = () => {
      reject({
        status: xhr.status || undefined,
        statusMessage: xhr.statusText || "Network error",
        response: xhr,
      });
    };

    xhr.send(formData);
  });
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
  const notify = useNotify();
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
        if (executeOpts.onProgress && import.meta.client) {
          const loadedByIndex = new Array(executeOpts.files.length).fill(0);
          const totalByIndex = executeOpts.files.map((fileObj) => {
            const file = fileObj.get("file");
            return file instanceof File ? file.size : 0;
          });

          const reportAggregateProgress = () => {
            const total = totalByIndex.reduce((sum, value) => sum + value, 0);
            const loaded = loadedByIndex.reduce((sum, value) => sum + value, 0);
            const percent = total > 0 ? Math.min(100, Math.max(0, Math.round((loaded / total) * 100))) : 0;
            executeOpts.onProgress?.({
              loaded,
              total,
              percent,
              count: executeOpts.files?.length || 0,
            });
          };

          executeOpts.onProgress({ loaded: 0, total: totalByIndex.reduce((sum, value) => sum + value, 0), percent: 0, count: executeOpts.files.length });

          const responses = await Promise.all(
            executeOpts.files.map(async (fileObj: FormData, index) => {
              lastAttemptedPath = finalPath;
              return uploadFormDataWithProgress<T>(finalPath, fileObj, {
                method: method as string,
                headers: finalHeaders,
                query: finalQuery,
                index,
                count: executeOpts.files?.length || 0,
                onProgress: (progress) => {
                  loadedByIndex[index] = totalByIndex[index]
                    ? Math.min(progress.loaded, totalByIndex[index])
                    : progress.loaded;
                  if (progress.percent === 100 && totalByIndex[index]) {
                    loadedByIndex[index] = totalByIndex[index];
                  }
                  reportAggregateProgress();
                },
              });
            })
          );

          executeOpts.onProgress({ loaded: totalByIndex.reduce((sum, value) => sum + value, 0), total: totalByIndex.reduce((sum, value) => sum + value, 0), percent: 100, count: executeOpts.files.length });
          data.value = responses as T;
          status.value = "success";
          return responses;
        }

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

      if (executeOpts?.onProgress && finalBody instanceof FormData && import.meta.client) {
        const file = finalBody.get("file");
        const total = file instanceof File ? file.size : 0;
        executeOpts.onProgress({ loaded: 0, total, percent: 0, count: 1 });
        const response = await uploadFormDataWithProgress<T>(fullPath, finalBody, {
          method: method as string,
          headers: finalHeaders,
          query: finalQuery,
          index: 0,
          count: 1,
          onProgress: (progress) => {
            executeOpts.onProgress?.({
              loaded: total ? Math.min(progress.loaded, total) : progress.loaded,
              total,
              percent: progress.percent,
              count: 1,
            });
          },
        });
        executeOpts.onProgress({ loaded: total, total, percent: 100, count: 1 });
        data.value = response;
        status.value = "success";
        return response;
      }

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
        notify.error("Error", errorMessage);
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
