export function ensureString(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "";
    }
  }
  return String(value);
}

export function ensureArray(value: any): any[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined) {
    return [];
  }
  return [value];
}

export function ensureBoolean(value: any): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === null || value === undefined) {
    return false;
  }
  return Boolean(value);
}

export function ensureNumber(value: any): number {
  if (typeof value === "number" && !isNaN(value)) {
    return value;
  }
  if (value === null || value === undefined) {
    return 0;
  }
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

export function ensureNotNull(value: any): any {
  return value !== null && value !== undefined ? value : null;
}
