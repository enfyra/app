import type { CodeVersionRead, ConfirmCodeVersion } from '~/types/code-audit';

export const VERSIONED_CODE_TABLES = [
  'enfyra_route_handler', 'enfyra_pre_hook', 'enfyra_post_hook', 'enfyra_helper',
  'enfyra_websocket', 'enfyra_websocket_event', 'enfyra_oauth_config',
  'enfyra_flow_step', 'enfyra_extension',
] as const;

export function normalizeCodeVersion(value: unknown): string {
  return String(value || '').trim().replace(/^v/i, '');
}

export function validCodeVersion(value: unknown): boolean {
  return /^\d+\.\d+\.\d+(\.\d+)*(-[0-9A-Za-z.]+)*$/.test(normalizeCodeVersion(value));
}

export function compareCodeVersions(left: unknown, right: unknown): number {
  const [a = '', ...aSuffix] = normalizeCodeVersion(left).split('-');
  const [b = '', ...bSuffix] = normalizeCodeVersion(right).split('-');
  const aCore = a.split('.').map(Number);
  const bCore = b.split('.').map(Number);
  for (let i = 0; i < Math.max(aCore.length, bCore.length); i++) {
    const delta = (aCore[i] ?? 0) - (bCore[i] ?? 0);
    if (delta) return delta < 0 ? -1 : 1;
  }
  if (!aSuffix.length && !bSuffix.length) return 0;
  if (!aSuffix.length) return -1;
  if (!bSuffix.length) return 1;
  for (let i = 0; i < Math.max(aSuffix.length, bSuffix.length); i++) {
    const x = aSuffix[i];
    const y = bSuffix[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = Number.parseInt(x, 10);
    const yn = Number.parseInt(y, 10);
    if (!Number.isNaN(xn) && !Number.isNaN(yn)) {
      if (xn !== yn) return xn < yn ? -1 : 1;
    } else {
      const delta = x.localeCompare(y);
      if (delta) return delta < 0 ? -1 : 1;
    }
  }
  return 0;
}

export function nextCodeVersion(current: unknown): string {
  if (!validCodeVersion(current)) throw new Error('Cannot read a valid current version. Refresh the record before saving.');
  const core = normalizeCodeVersion(current).split('-')[0]!.split('.');
  const patch = Number(core[2]);
  if (!Number.isSafeInteger(patch) || !Number.isSafeInteger(patch + 1)) throw new Error('Choose a custom valid version.');
  return `${core[0]}.${core[1]}.${patch + 1}`;
}

export async function prepareCodeUpdate(
  path: string,
  body: Record<string, unknown>,
  read: CodeVersionRead,
  confirm: ConfirmCodeVersion,
  idField: 'id' | '_id' = 'id',
): Promise<Record<string, unknown>> {
  const match = /^\/api\/([^/?]+)\/([^/?]+)(?:\?.*)?$/.exec(path);
  if (!match || !VERSIONED_CODE_TABLES.some(table => table === match[1])) return body;
  const tableName = match[1]!;
  const recordId = decodeURIComponent(match[2]!);
  const response = await read(`/api/${tableName}`, { query: { fields: 'version', limit: 1, filter: { [idField]: { _eq: recordId } } } });
  const currentVersion = normalizeCodeVersion(response.data?.[0]?.version);
  const suggestion = nextCodeVersion(currentVersion);
  const candidate = normalizeCodeVersion(body?.version);
  const version = await confirm({ tableName, recordId, currentVersion, suggestedVersion: validCodeVersion(candidate) && compareCodeVersions(candidate, currentVersion) > 0 ? candidate : suggestion });
  if (version === null) throw new DOMException('Version confirmation cancelled', 'AbortError');
  if (!validCodeVersion(version) || compareCodeVersions(version, currentVersion) <= 0) throw new Error(`Version must be valid and greater than ${currentVersion}.`);
  return { ...body, version: normalizeCodeVersion(version) };
}
