export function resolveRouteIdentifier(value: unknown) {
  const resolved = Array.isArray(value) ? value[0] : value;
  return resolved == null ? "" : String(resolved);
}

export function buildFlowExecutionDetailFilter(
  flowId: string | number,
  executionId: string | number,
  idField: string,
) {
  return {
    _and: [
      { [idField]: { _eq: executionId } },
      { flow: { _eq: flowId } },
    ],
  };
}
