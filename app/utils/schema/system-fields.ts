export const RECORD_PRIMARY_KEY_FIELDS = new Set(['id', '_id']);

export const CREATE_RECORD_SYSTEM_FIELDS = new Set([
  ...RECORD_PRIMARY_KEY_FIELDS,
  'createdAt',
  'updatedAt',
  'isSystem',
  'isRootAdmin',
]);

export function isCreateRecordSystemField(key: string) {
  return CREATE_RECORD_SYSTEM_FIELDS.has(key);
}
