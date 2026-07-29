import type { Ref } from 'vue';

export const getId = (item: any): string | null => {
  const id = item?.id || item?._id;
  return id ? String(id) : null;
};

export const isSystemTableModifiable = (tableName: string): boolean => {
  const modifiableSystemTables = ["enfyra_user"];
  return modifiableSystemTables.includes(tableName);
};

export function isVueRef<T = any>(
  value: any,
  typeChecker?: (val: any) => val is T
): value is Ref<T> {
  if (!value || typeof value !== 'object') return false;
  if (!('value' in value)) return false;

  if (!typeChecker) return true;

  return typeChecker(value.value);
}

export function createRefTypeGuard<T>(
  shapeValidator: (val: any) => val is T
) {
  return (value: any): value is Ref<T> => {
    return isVueRef(value, shapeValidator);
  };
}

export function isSchemaCollection(val: any): val is Record<string, any> {
  return val !== null &&
         typeof val === 'object' &&
         !Array.isArray(val);
}

export const isRefSchemaCollection = createRefTypeGuard(isSchemaCollection);
