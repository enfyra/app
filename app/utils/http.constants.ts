export const HTTP_METHODS = ['GET', 'POST', 'PATCH', 'DELETE'] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export type MethodColorRecord = {
  name?: string | null;
  buttonColor?: string | null;
  textColor?: string | null;
};

export const METHOD_COLOR_PRESETS = [
  { label: 'Blue', buttonColor: '#dbeafe', textColor: '#1d4ed8' },
  { label: 'Green', buttonColor: '#dcfce7', textColor: '#15803d' },
  { label: 'Amber', buttonColor: '#fef3c7', textColor: '#b45309' },
  { label: 'Red', buttonColor: '#fee2e2', textColor: '#b91c1c' },
  { label: 'Purple', buttonColor: '#ede9fe', textColor: '#7c3aed' },
  { label: 'Cyan', buttonColor: '#cffafe', textColor: '#0e7490' },
  { label: 'Indigo', buttonColor: '#e0e7ff', textColor: '#4338ca' },
  { label: 'Pink', buttonColor: '#fce7f3', textColor: '#be185d' },
  { label: 'Lime', buttonColor: '#ecfccb', textColor: '#4d7c0f' },
  { label: 'Slate', buttonColor: '#f1f5f9', textColor: '#334155' },
] as const;

const DEFAULT_METHOD_COLORS = {
  buttonColor: '#f1f5f9',
  textColor: '#334155',
};

const METHOD_COLOR_MAP: Record<string, { buttonColor: string; textColor: string }> = {
  GET: { buttonColor: '#dbeafe', textColor: '#1d4ed8' },
  POST: { buttonColor: '#dcfce7', textColor: '#15803d' },
  PUT: { buttonColor: '#fef3c7', textColor: '#b45309' },
  PATCH: { buttonColor: '#fef3c7', textColor: '#b45309' },
  DELETE: { buttonColor: '#fee2e2', textColor: '#b91c1c' },
  HEAD: { buttonColor: '#f1f5f9', textColor: '#334155' },
  OPTIONS: { buttonColor: '#f1f5f9', textColor: '#334155' },
};

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_RE.test(value.trim());
}

export function normalizeHexColor(value: unknown, fallback: string): string {
  if (!isHexColor(value)) return fallback;
  return value.trim().toLowerCase();
}

export function normalizeMethodName(method: unknown): string {
  return String(method ?? '').trim().toUpperCase();
}

export function getSuggestedMethodColors(method: unknown) {
  const key = normalizeMethodName(method);
  return METHOD_COLOR_MAP[key] || DEFAULT_METHOD_COLORS;
}

export function getMethodColors(method: MethodColorRecord | string | null | undefined) {
  const record =
    typeof method === 'string' ? { name: method } : method || {};
  const suggested = getSuggestedMethodColors(record.name);
  return {
    buttonColor: normalizeHexColor(record.buttonColor, suggested.buttonColor),
    textColor: normalizeHexColor(record.textColor, suggested.textColor),
  };
}

export function getMethodLabel(method: MethodColorRecord | string | null | undefined) {
  return normalizeMethodName(typeof method === 'string' ? method : method?.name);
}
