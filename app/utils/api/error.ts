import type { ApiError } from "~/types/api";

function isApiErrorRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

export function getApiErrorRecord(value: unknown): Record<string, unknown> | undefined {
  return isApiErrorRecord(value) ? value : undefined;
}

export function getApiErrorStatus(error: unknown): number | undefined {
  const failure = getApiErrorRecord(error);
  const response = getApiErrorRecord(failure?.response);
  const status = failure?.statusCode ?? failure?.status ?? response?.status;
  return typeof status === "number" ? status : undefined;
}

export function getApiErrorEnvelope(data: unknown): Record<string, unknown> | undefined {
  const envelope = getApiErrorRecord(data);
  return getApiErrorRecord(envelope?.error ?? data);
}

export function normalizeApiError(error: unknown, requestPath?: string): ApiError {
  const failure = getApiErrorRecord(error);
  const response = getApiErrorRecord(failure?.response);
  const statusMessage = failure?.statusMessage ?? response?.statusText;
  const data = failure?.data ?? response?._data ?? response?.data;
  const candidate =
    (typeof failure?.message === "string" ? failure.message : undefined) ??
    getApiErrorEnvelope(data)?.message ??
    (typeof data === "string" ? data : undefined) ??
    statusMessage;
  const message = Array.isArray(candidate)
    ? candidate.join(". ")
    : typeof candidate === "string" && candidate.length > 0
      ? candidate
      : candidate != null && typeof candidate !== "string"
        ? String(candidate)
        : typeof statusMessage === "string" && statusMessage
          ? statusMessage
          : "Request failed";
  const requestUrl =
    (typeof failure?.request === "string" && failure.request) ||
    (typeof failure?.url === "string" && failure.url) ||
    requestPath ||
    (typeof response?.url === "string" && response.url);

  return {
    message,
    status: getApiErrorStatus(error),
    statusMessage: typeof statusMessage === "string" ? statusMessage : undefined,
    url: typeof requestUrl === "string" ? requestUrl : undefined,
    data,
    response: failure?.response || error,
  };
}
