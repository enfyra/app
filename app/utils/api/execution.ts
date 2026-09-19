function invalidIdentifier(message: string) {
  return Object.assign(new Error(message), {
    statusCode: 400,
    statusMessage: message,
  });
}

export function isValidApiIdentifier(value: unknown) {
  return value !== undefined && value !== null && value !== "";
}

export function buildApiPath(
  ...segments: Array<string | number | null | undefined>
) {
  const hasLeadingSlash =
    typeof segments[0] === "string" && segments[0].startsWith("/");
  const path = segments
    .filter(isValidApiIdentifier)
    .map((segment) => String(segment).replace(/^\/+|\/+$/g, ""))
    .filter((segment) => segment.length > 0)
    .join("/");
  return hasLeadingSlash ? `/${path}` : path;
}

export function assertValidApiIdentifiers(options: {
  id?: unknown;
  ids?: unknown;
}) {
  if (
    Object.prototype.hasOwnProperty.call(options, "id") &&
    !isValidApiIdentifier(options.id)
  ) {
    throw invalidIdentifier("Record id is required");
  }

  if (Object.prototype.hasOwnProperty.call(options, "ids")) {
    if (!Array.isArray(options.ids) || options.ids.length === 0) {
      throw invalidIdentifier("At least one record id is required");
    }
    if (options.ids.some((id) => !isValidApiIdentifier(id))) {
      throw invalidIdentifier("Every record id is required");
    }
  }
}

export function shouldCancelPreviousApiRequest(
  method: string,
  override?: boolean,
) {
  return override ?? ["get", "head"].includes(method.toLowerCase());
}

export async function runBoundedApiBatch<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency: number,
) {
  const results = new Array<R>(items.length);
  const failures: unknown[] = [];
  let cursor = 0;
  const workerCount = Math.min(
    items.length,
    Math.max(1, Math.floor(concurrency) || 1),
  );

  const runWorker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = await worker(items[index]!, index);
      } catch (error) {
        failures.push(error);
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, runWorker));
  if (failures.length > 0) throw failures[0];
  return results;
}
