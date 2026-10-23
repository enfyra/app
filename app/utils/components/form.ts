export function ensureString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2) ?? "";
    } catch {
      return "";
    }
  }
  return String(value);
}

export function ensureBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === null || value === undefined) {
    return false;
  }
  return Boolean(value);
}

export function ensureNumber(value: unknown): number {
  if (typeof value === "number" && !isNaN(value)) {
    return value;
  }
  if (value === null || value === undefined) {
    return 0;
  }
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

export function ensureNotNull<T>(value: T): NonNullable<T> | null {
  return value !== null && value !== undefined ? value : null;
}

export function parseFieldArrayValue(
  modelValue: string[] | string | null | undefined
): string[] {
  if (!modelValue) return [];
  if (Array.isArray(modelValue)) return modelValue;
  if (typeof modelValue !== "string") return [];
  try {
    if (modelValue.startsWith("[") && modelValue.endsWith("]")) {
      const content = modelValue.slice(1, -1);
      if (!content.trim()) return [];

      return content
        .split(",")
        .map((item: string) => {
          let cleaned = item.trim();
          if (
            (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
            (cleaned.startsWith("'") && cleaned.endsWith("'"))
          ) {
            cleaned = cleaned.slice(1, -1);
          }

          cleaned = cleaned.replace(/\\"/g, '"').replace(/\\'/g, "'");
          return cleaned;
        })
        .filter((item: string) => item.length > 0);
    }
    return [];
  } catch {
    return [];
  }
}
