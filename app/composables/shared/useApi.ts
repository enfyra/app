import { ref } from 'vue';
import { useAppActivity } from './useAppActivity';
import type { ApiBatchComposable, ApiBatchExecuteOptions, ApiBatchOptions, ApiBody, ApiComposable, ApiError, ApiExecutionResult, ApiOptions, ApiQuery, ApiSingleExecuteOptions, ApiTransportContext } from '~/types/api';
import { getApiErrorEnvelope, getApiErrorRecord, normalizeApiError } from '~/utils/api/error';
import { prepareCodeUpdate } from '~/utils/code-version';
import { assertValidApiIdentifiers, buildApiPath, runBoundedApiBatch, shouldCancelPreviousApiRequest } from '~/utils/api/execution';

function formatSchemaIndexConflict(apiError: ApiError): string | null {
  const envelope = getApiErrorEnvelope(apiError.data);
  const details = getApiErrorRecord(envelope?.details);
  if (envelope?.code !== 'SCHEMA_INDEX_OVER_UNIQUE_FIELD' && details?.code !== 'SCHEMA_INDEX_OVER_UNIQUE_FIELD') return null;
  const conflicts = details?.conflicts;
  if (!Array.isArray(conflicts) || conflicts.length === 0) return null;
  return conflicts.map((value: unknown) => {
    const conflict = getApiErrorRecord(value);
    const index = Array.isArray(conflict?.index) ? conflict.index.join(', ') : '';
    const uniques = Array.isArray(conflict?.uniqueConstraints)
      ? conflict.uniqueConstraints.map((value: unknown) => {
        const constraint = getApiErrorRecord(value);
        return Array.isArray(constraint?.fields) ? constraint.fields.join(', ') : '';
      }).filter(Boolean)
      : [];
    if (!index || uniques.length === 0) return null;
    return `Index (${index}) overlaps unique constraint${uniques.length > 1 ? 's' : ''}: ${uniques.map((fields: string) => `(${fields})`).join(', ')}.`;
  }).filter((description): description is string => Boolean(description)).join(' ') || null;
}

async function resolveApiQueryValue(value: unknown, invokeGetter = false): Promise<unknown> {
  let resolved: unknown = unref(value);
  if (invokeGetter && typeof resolved === 'function') resolved = resolved();
  resolved = await resolved;
  if (Array.isArray(resolved)) return Promise.all(resolved.map(item => resolveApiQueryValue(item)));
  if (resolved && typeof resolved === 'object' && (Object.getPrototypeOf(resolved) === Object.prototype || Object.getPrototypeOf(resolved) === null)) {
    return Object.fromEntries(await Promise.all(Object.entries(resolved).map(async ([key, item]) => [key, await resolveApiQueryValue(item)])));
  }
  return resolved;
}

function handleError(error: unknown, context: string | undefined, method: string, requestPath: string | undefined): ApiError {
  const apiError = normalizeApiError(error, requestPath);
  const { message, status, statusMessage, url } = apiError;
  console.error(`[API Error]${context ? ` (${context})` : ''} ${method.toUpperCase()}${status != null ? ` ${status}` : ''}${statusMessage ? ` ${statusMessage}` : ''}${url ? ` ${url}` : ''}: ${message}`);
  return apiError;
}

export function shouldNavigateToErrorPage(apiError: ApiError, _method: string): boolean {
  const status = apiError.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return status == null || status >= 500;
}

function isAbortError(error: unknown): boolean {
  const failure = getApiErrorRecord(error);
  return failure?.name === 'AbortError' || getApiErrorRecord(failure?.cause)?.name === 'AbortError';
}

function isUpdateBody(body: ApiBody | undefined): body is Record<string, unknown> {
  return body !== null && typeof body === 'object' && (Object.getPrototypeOf(body) === Object.prototype || Object.getPrototypeOf(body) === null);
}

async function fetchApi<T>(context: ApiTransportContext, path: string, body: ApiBody | undefined, headers = context.headers): Promise<T> {
  context.onAttempt(path);
  try {
    return await $fetch<T>(path, {
      method: context.method,
      ...(body ? { body: toRaw(body) } : {}),
      headers,
      ...(context.query !== undefined ? { query: context.query } : {}),
      signal: context.signal,
    });
  } catch (error) {
    const failure = getApiErrorRecord(error);
    if (failure) failure.request ??= path;
    throw error;
  }
}

export function useApi<T = unknown>(url: string | (() => string), options: ApiBatchOptions): ApiBatchComposable<T>;
export function useApi<T = unknown>(url: string | (() => string), options?: ApiOptions): ApiComposable<T>;
export function useApi<T = unknown>(url: string | (() => string), options: ApiOptions | ApiBatchOptions = {}): ApiComposable<T> | ApiBatchComposable<T> {
  if (options.batch) {
    const api = createApi<T[], ApiBatchExecuteOptions>(url, options, async (context, executeOptions) => {
      if (!executeOptions) throw new Error('Batch execution requires ids or files');
      const concurrency = Math.max(1, Number(executeOptions.concurrent ?? executeOptions.batchSize ?? 4) || 4);
      if (executeOptions.files) {
        return runBoundedApiBatch(executeOptions.files, (file, index) => fetchApi<T>(context, context.path, file, { ...context.headers, ...executeOptions.headersByIndex?.[index] }), concurrency);
      }
      const preparedBodies = new Map<string | number, ApiBody | undefined>();
      for (const id of executeOptions.ids) preparedBodies.set(id, await context.prepareBody(buildApiPath(context.path, id)));
      return runBoundedApiBatch(executeOptions.ids, id => fetchApi<T>(context, buildApiPath(context.path, id), preparedBodies.get(id)), concurrency);
    });
    return { data: api.data, error: api.error, pending: api.pending, status: api.status, execute: api.execute, executeWithResult: api.executeWithResult, cancel: api.cancel };
  }
  return createApi<T, ApiSingleExecuteOptions>(url, options, async (context, executeOptions) => {
    const path = executeOptions && Object.prototype.hasOwnProperty.call(executeOptions, 'id') ? buildApiPath(context.path, executeOptions.id) : context.path;
    context.onAttempt(path);
    const body = await context.prepareBody(path);
    if (context.signal.aborted) throw new DOMException('Request cancelled', 'AbortError');
    return fetchApi<T>(context, path, body);
  });
}

function createApi<T, Options extends ApiSingleExecuteOptions | ApiBatchExecuteOptions>(
  url: string | (() => string),
  options: ApiOptions | ApiBatchOptions,
  send: (context: ApiTransportContext, executeOptions?: Options) => Promise<T>,
): ApiComposable<T, Options> {
  const notify = useNotify();
  const { beginRequest } = useAppActivity();
  const codeVersion = useCodeVersion();
  const { getIdFieldName } = useDatabase();
  const { method = 'get', body, query, errorContext, onError, disableErrorPage } = options;
  const data: ApiComposable<T>['data'] = ref(null);
  const error = ref<ApiError | null>(null);
  const pending = ref(false);
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle');
  const activeControllers = new Set<AbortController>();
  let latestController: AbortController | null = null;
  const cancelPrevious = shouldCancelPreviousApiRequest(method, options.cancelPrevious);

  const executeRequest = async (executeOptions?: Options): Promise<ApiExecutionResult<T>> => {
    if (cancelPrevious) for (const controller of activeControllers) controller.abort();
    const endRequest = beginRequest();
    const currentController = new AbortController();
    const hadActiveRequests = activeControllers.size > 0;
    activeControllers.add(currentController);
    latestController = currentController;
    const abortFromExternalSignal = () => currentController.abort();
    if (executeOptions?.signal) {
      if (executeOptions.signal.aborted) currentController.abort();
      else executeOptions.signal.addEventListener('abort', abortFromExternalSignal, { once: true });
    }
    pending.value = true;
    if (cancelPrevious || !hadActiveRequests) error.value = null;
    status.value = 'pending';
    const canCommit = () => !cancelPrevious || latestController === currentController;
    let lastAttemptedPath: string | undefined;
    try {
      const basePath = (typeof url === 'function' ? url() : url).replace(/^\/?api\/?/, '').replace(/^\/+/, '');
      if (executeOptions) assertValidApiIdentifiers(executeOptions);
      const finalBody = executeOptions?.body || toValue(body);
      const resolvedQuery = await resolveApiQueryValue(executeOptions?.query ?? query, executeOptions?.query === undefined);
      const finalQuery: ApiQuery | undefined = resolvedQuery === undefined ? undefined : getApiErrorRecord(resolvedQuery);
      if (resolvedQuery !== undefined && finalQuery === undefined) throw new Error('API query must resolve to an object');
      const finalHeaders = { ...options.headers, ...executeOptions?.headers };
      const finalPath = '/api/' + basePath;
      lastAttemptedPath = finalPath;
      const prepareBody = async (path: string): Promise<ApiBody | undefined> => {
        if (method.toLowerCase() !== 'patch' || !isUpdateBody(finalBody)) return finalBody;
        return prepareCodeUpdate(path, finalBody, (readPath, readOptions) => $fetch(readPath, { ...readOptions, headers: finalHeaders, signal: currentController.signal }), details => codeVersion.confirm(details, currentController.signal), getIdFieldName());
      };
      const response = await send({ path: finalPath, method, query: finalQuery, headers: finalHeaders, signal: currentController.signal, prepareBody, onAttempt: path => { lastAttemptedPath = path; } }, executeOptions);
      if (!canCommit()) return { ok: false, error: null, aborted: true };
      data.value = response;
      status.value = 'success';
      return { ok: true, data: response };
    } catch (failure) {
      if (failure instanceof DOMException && failure.message === 'Version confirmation cancelled') {
        error.value = { message: 'Save cancelled' };
        status.value = 'idle';
        return { ok: false, error: null, aborted: true };
      }
      if (!canCommit() || isAbortError(failure) || currentController.signal.aborted) return { ok: false, error: null, aborted: true };
      const apiError = handleError(failure, errorContext, method, lastAttemptedPath);
      const handled = onError?.(apiError, errorContext) === true;
      if (!handled && apiError.status === 401 && typeof window !== 'undefined') {
        redirectToLoginOnce();
      } else if (!handled && !disableErrorPage && shouldNavigateToErrorPage(apiError, method)) {
        showError(createError({
          statusCode: apiError.status != null && apiError.status >= 400 ? apiError.status : 503,
          statusMessage: apiError.statusMessage || apiError.message || 'Request failed',
          message: errorContext ? `${errorContext}: ${apiError.message}` : apiError.message,
          data: { url: apiError.url, context: errorContext },
        }));
      } else if (!handled) {
        const message = getApiErrorEnvelope(apiError.data)?.message || apiError.message || 'An error occurred';
        const conflict = formatSchemaIndexConflict(apiError);
        notify.error(conflict ? 'Schema constraint conflict' : 'Error', conflict || (Array.isArray(message) ? message.join('. ') : String(message)));
      }
      error.value = apiError;
      status.value = 'error';
      return { ok: false, error: apiError, aborted: false };
    } finally {
      endRequest();
      executeOptions?.signal?.removeEventListener('abort', abortFromExternalSignal);
      activeControllers.delete(currentController);
      if (latestController === currentController) latestController = null;
      pending.value = activeControllers.size > 0;
    }
  };
  const execute = async (executeOptions?: Options) => {
    const result = await executeRequest(executeOptions);
    return result.ok ? result.data : null;
  };
  const cancel = () => {
    for (const controller of activeControllers) controller.abort();
    activeControllers.clear();
    latestController = null;
    pending.value = false;
    if (status.value === 'pending') status.value = 'idle';
  };
  return { data, error, pending, refresh: () => execute(), execute, executeWithResult: executeRequest, cancel, status };
}
