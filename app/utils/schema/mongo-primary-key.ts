export const MONGO_PRIMARY_KEY_NAME = '_id';
export const MONGO_PRIMARY_KEY_TYPE = 'ObjectId';

export function isMongoPrimaryKeyColumn(column: any): boolean {
  return (
    column?.isPrimary === true &&
    (column?.name === MONGO_PRIMARY_KEY_NAME || column?.name === 'id')
  );
}

export function normalizeMongoPrimaryKeyColumn<T extends Record<string, any>>(
  column: T,
): T {
  if (!isMongoPrimaryKeyColumn(column)) return column;
  if (
    column.name === MONGO_PRIMARY_KEY_NAME &&
    column.type === MONGO_PRIMARY_KEY_TYPE
  ) {
    return column;
  }
  return {
    ...column,
    name: MONGO_PRIMARY_KEY_NAME,
    type: MONGO_PRIMARY_KEY_TYPE,
  };
}
