type MethodRecord = Record<string, any>;

type GetMethodId = (method: MethodRecord) => string | number | null | undefined;

export function getMethodIdentity(method: MethodRecord | null | undefined, getId: GetMethodId): string | null {
  if (!method) return null;
  if (method.method != null) return String(method.method);

  const id = getId(method);
  return id != null ? `id:${String(id)}` : null;
}

export function getSelectedMethodIdentities(
  modelValue: any,
  multiple: boolean,
  getId: GetMethodId,
): Set<string> {
  if (multiple) {
    if (!Array.isArray(modelValue)) return new Set<string>();
    return new Set(
      modelValue
        .map((method: MethodRecord) => getMethodIdentity(method, getId))
        .filter((identity): identity is string => !!identity),
    );
  }

  const identity = getMethodIdentity(modelValue, getId);
  return identity ? new Set([identity]) : new Set<string>();
}

export function filterMethodsByAllowedMethodNames(modelValue: any, allowedMethods: string[]): any {
  const allowedSet = new Set(allowedMethods);

  if (Array.isArray(modelValue)) {
    return modelValue.filter((method: MethodRecord) => method?.method != null && allowedSet.has(String(method.method)));
  }

  if (!modelValue) return modelValue;
  return modelValue.method != null && allowedSet.has(String(modelValue.method)) ? modelValue : null;
}
