import type { Ref } from 'vue';

export function isVueRef<T = any>(
  value: any,
  typeChecker?: (val: any) => val is T
): value is Ref<T> {
  if (!value || typeof value !== 'object') return false;
  if (!('value' in value)) return false;

  if (!typeChecker) return true;

  return typeChecker(value.value);
}

export function isRefObject<T extends Record<string, any>>(
  value: any
): value is Ref<T> {
  return isVueRef(value, (val): val is T => 
    val !== null && typeof val === 'object' && !Array.isArray(val)
  );
}

export function isRefArray<T = any>(
  value: any
): value is Ref<T[]> {
  return isVueRef(value, (val): val is T[] => Array.isArray(val));
}

export function isRefString(value: any): value is Ref<string> {
  return isVueRef(value, (val): val is string => typeof val === 'string');
}

export function isRefNumber(value: any): value is Ref<number> {
  return isVueRef(value, (val): val is number => typeof val === 'number');
}

export function isRefBoolean(value: any): value is Ref<boolean> {
  return isVueRef(value, (val): val is boolean => typeof val === 'boolean');
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

export function isTableDefinitionField(val: any): val is { fieldType: string; name?: string } {
  return val !== null && 
         typeof val === 'object' && 
         typeof val.fieldType === 'string';
}

export function isApiResponse(val: any): val is { data: any[] } {
  return val !== null && 
         typeof val === 'object' && 
         Array.isArray(val.data);
}

export const isRefSchemaCollection = createRefTypeGuard(isSchemaCollection);
export const isRefTableDefinitionFields = createRefTypeGuard(
  (val: any): val is Array<{ fieldType: string; name?: string }> => 
    Array.isArray(val) && val.every(isTableDefinitionField)
);
export const isRefApiResponse = createRefTypeGuard(isApiResponse);