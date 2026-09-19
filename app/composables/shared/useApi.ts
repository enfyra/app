import type { ApiError, ApiExecutionResult } from "~/types/api";
import {
  assertValidApiIdentifiers,
  buildApiPath,
  runBoundedApiBatch,
  shouldCancelPreviousApiRequest,
} from "~/utils/api/execution";

interface ExecuteOptions {
  id?: string | number;
  ids?: (string | number)[];
  body?: any;
  query?: any;
  headers?: Record<string, string>;
  headersByIndex?: Record<number, Record<string, string>>;
  files?: FormData[];
  batchSize?: number;
  concurrent?: number;
  signal?: AbortSignal;
}

function formatSchemaIndexConflict(apiError: ApiError): string | null {
  const envelope = apiError.data?.error ?? apiError.data;
  if (
    envelope?.code !== 'SCHEMA_INDEX_OVER_UNIQUE_FIELD'
    && envelope?.details?.code !== 'SCHEMA_INDEX_OVER_UNIQUE_FIELD'
  ) return null;

  const conflicts = envelope.details?.conflicts;
  if (!Array.isArray(conflicts) || conflicts.length === 0) return null;

  return conflicts
    .map((conflict: any) => {
      const index = Array.isArray(conflict?.index) ? conflict.index.join(', ') : '';
      const uniques = Array.isArray(conflict?.uniqueConstraints)
        ? conflict.uniqueConstraints
          .map((constraint: any) => Array.isArray(constraint?.fields) ? constraint.fields.join(', ') : '')
          .filter(Boolean)
        : [];
      if (!index || uniques.length === 0) return null;
      return `Index (${index}) overlaps unique constraint${uniques.length > 1 ? 's' : ''}: ${uniques.map((fields: string) => `(${fields})`).join(', ')}.`;
    })
    .filter((description: string | null): description is string => Boolean(description))
    .join(' ')
    || null;
}

async function resolveApiQueryValue(value: any, invokeGetter = false): Promise<any> {
  let resolved = unref(value);
  if (invokeGetter && typeof resolved === "function") {
    resolved = resolved();
  }
  resolved = await resolved;

  if (Array.isArray(resolved)) {
    return Promise.all(resolved.map((item) => resolveApiQueryValue(item)));
  }

  if (
    resolved &&
    typeof resolved === "object" &&
    (Object.getPrototypeOf(resolved) === Object.prototype ||
      Object.getPrototypeOf(resolved) === null)
  ) {
    const entries = await Promise.all(
      Object.entries(resolved).map(async ([key, item]) => [
        key,
        await resolveApiQueryValue(item),
      ]),
    );
    return Object.fromEntries(entries);
  }

  return resolved;
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

  const errorEnvelope =
    data && typeof data === "object" && data !== null
      ? ((data as { error?: unknown }).error ?? data)
      : undefined;
  const dataMessage =
    errorEnvelope &&
    typeof errorEnvelope === "object" &&
    "message" in errorEnvelope
      ? (errorEnvelope as { message?: unknown }).message
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

export function shouldNavigateToErrorPage(apiError: ApiError, method: string): boolean {
  const s = apiError.status;
  if (s === 401) return false;
  if (s === 403 || s === 404) return false;
  if (s != null && s >= 500) return true;
  if (s == null) return true;
  return false;
}

function isAbortError(error: any): boolean {
  return error?.name === "AbortError" || error?.cause?.name === "AbortError";
}

export function useApi<T = any>(url: string | (() => string), options: any = {}) {
  const notify = useNotify();
  const { method = "get", body, query, errorContext, onError, disableErrorPage } = options;

  const data = ref<T | null>(null);
  const error = ref<ApiError | null>(null);
  const pending = ref(false);
  const status = ref<string>("idle");
  const activeControllers = new Set<AbortController>();
  let latestController: AbortController | null = null;
  const cancelPrevious = shouldCancelPreviousApiRequest(
    String(method),
    options.cancelPrevious,
  );

  const executeRequest = async (
    executeOpts?: ExecuteOptions,
  ): Promise<ApiExecutionResult<T>> => {
    if (cancelPrevious) {
      for (const controller of activeControllers) controller.abort();
    }
    const currentController = new AbortController();
    const hadActiveRequests = activeControllers.size > 0;
    activeControllers.add(currentController);
    latestController = currentController;
    const abortFromExternalSignal = () => currentController.abort();
    if (executeOpts?.signal) {
      if (executeOpts.signal.aborted) currentController.abort();
      else {
        executeOpts.signal.addEventListener("abort", abortFromExternalSignal, {
          once: true,
        });
      }
    }
    pending.value = true;
    if (cancelPrevious || !hadActiveRequests) error.value = null;
    status.value = "pending";
    const canCommit = () => !cancelPrevious || latestController === currentController;

    let lastAttemptedPath: string | undefined;

    try {
      const basePath = (typeof url === "function" ? url() : url)
        .replace(/^\/?api\/?/, "")
        .replace(/^\/+/, "");
      if (executeOpts) assertValidApiIdentifiers(executeOpts);
      const finalBody = executeOpts?.body || unref(body);
      const finalQuery = await resolveApiQueryValue(
        executeOpts?.query ?? query,
        executeOpts?.query === undefined,
      );
      const finalHeaders = {
        ...(options.headers || {}),
        ...(executeOpts?.headers || {}),
      };
      const batchConcurrency = Math.max(
        1,
        Number(executeOpts?.concurrent ?? executeOpts?.batchSize ?? 4) || 4,
      );

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

      const finalPath = "/api/" + basePath;
      lastAttemptedPath = finalPath;

      // Handle batch file upload
      if (
        isBatchOperation &&
        executeOpts?.files &&
        Array.isArray(executeOpts.files) &&
        executeOpts.files.length > 0
      ) {
        const responses = await runBoundedApiBatch(
          executeOpts.files,
          async (fileObj: FormData, index) => {
            lastAttemptedPath = finalPath;
            try {
              return await $fetch<T>(finalPath, {
                method: method as any,
                body: fileObj,
                headers: {
                  ...finalHeaders,
                  ...(executeOpts.headersByIndex?.[index] || {}),
                },
                query: finalQuery,
                signal: currentController.signal,
              });
            } catch (requestError: any) {
              if (requestError && typeof requestError === "object") {
                requestError.request ??= finalPath;
              }
              throw requestError;
            }
          },
          batchConcurrency,
        );

        if (!canCommit()) {
          return { ok: false, error: null, aborted: true };
        }
        data.value = responses as T;
        status.value = "success";
        return { ok: true, data: responses as T };
      }

      // Handle batch operations with ids
      if (isBatchOperation && executeOpts?.ids && executeOpts.ids.length > 0) {
        const responses = await runBoundedApiBatch(
          executeOpts.ids,
          async (id) => {
            const fullPath = buildApiPath(finalPath, id);
            lastAttemptedPath = fullPath;
            try {
              return await $fetch<T>(fullPath, {
                method: method as any,
                body: finalBody ? toRaw(finalBody) : undefined,
                headers: finalHeaders,
                query: finalQuery,
                signal: currentController.signal,
              });
            } catch (requestError: any) {
              if (requestError && typeof requestError === "object") {
                requestError.request ??= fullPath;
              }
              throw requestError;
            }
          },
          batchConcurrency,
        );

        if (!canCommit()) {
          return { ok: false, error: null, aborted: true };
        }
        data.value = responses as T;
        status.value = "success";
        return { ok: true, data: responses as T };
      }

      const fullPath = executeOpts && Object.prototype.hasOwnProperty.call(executeOpts, "id")
        ? buildApiPath(finalPath, executeOpts.id)
        : finalPath;

      lastAttemptedPath = fullPath;

      const response = await $fetch<T>(fullPath, {
        method: method as any,
        body: finalBody ? toRaw(finalBody) : undefined,
        headers: finalHeaders,
        query: finalQuery,
        signal: currentController.signal,
      });

      if (!canCommit()) {
        return { ok: false, error: null, aborted: true };
      }
      data.value = response;
      status.value = "success";
      return { ok: true, data: response };
    } catch (err) {
      if (
        !canCommit() ||
        isAbortError(err) ||
        currentController.signal.aborted
      ) {
        return { ok: false, error: null, aborted: true };
      }
      const apiError = handleError(err, errorContext, undefined, {
        method: String(method || "get"),
        path: lastAttemptedPath,
      });
      const handled = onError ? onError(apiError, errorContext) === true : false;
      if (!handled && apiError.status === 401 && typeof window !== "undefined") {
        redirectToLoginOnce();
        error.value = apiError;
        status.value = "error";
        return { ok: false, error: apiError, aborted: false };
      }
      if (
        !handled &&
        !disableErrorPage &&
        shouldNavigateToErrorPage(apiError, String(method || 'get'))
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
        return { ok: false, error: apiError, aborted: false };
      }
      if (!handled) {
        const envelope = apiError?.data?.error ?? apiError?.data;
        let errorMessage = envelope?.message || apiError?.message || "An error occurred";
        if (Array.isArray(errorMessage)) {
          errorMessage = errorMessage.join(". ");
        }
        const schemaConflict = formatSchemaIndexConflict(apiError);
        notify.error(
          schemaConflict ? "Schema constraint conflict" : "Error",
          schemaConflict || errorMessage,
        );
      }
      error.value = apiError;
      status.value = "error";
      return { ok: false, error: apiError, aborted: false };
    } finally {
      executeOpts?.signal?.removeEventListener(
        "abort",
        abortFromExternalSignal,
      );
      activeControllers.delete(currentController);
      if (latestController === currentController) latestController = null;
      pending.value = activeControllers.size > 0;
    }
  };

  const execute = async (executeOpts?: ExecuteOptions) => {
    const result = await executeRequest(executeOpts);
    return result.ok ? result.data : null;
  };

  const cancel = () => {
    for (const controller of activeControllers) controller.abort();
    activeControllers.clear();
    latestController = null;
    pending.value = false;
    if (status.value === "pending") status.value = "idle";
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
    executeWithResult: executeRequest,
    cancel,
    status,
  };
}
