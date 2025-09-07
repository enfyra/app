import type { Ref } from 'vue';

/**
 * Type guard to check if a value is a Vue Ref containing a specific type
 * @param value - The value to check
 * @param typeChecker - Optional function to validate the inner type
 * @returns Type predicate indicating if value is Ref<T>
 */
export function isVueRef<T = any>(
  value: any,
  typeChecker?: (val: any) => val is T
): value is Ref<T> {
  if (!value || typeof value !== 'object') return false;
  if (!('value' in value)) return false;
  
  // If no type checker provided, just check if it's a ref-like object
  if (!typeChecker) return true;
  
  // Use the type checker to validate the inner value
  return typeChecker(value.value);
}

/**
 * Type guard to check if a value is a Ref containing an object
 */
export function isRefObject<T extends Record<string, any>>(
  value: any
): value is Ref<T> {
  return isVueRef(value, (val): val is T => 
    val !== null && typeof val === 'object' && !Array.isArray(val)
  );
}

/**
 * Type guard to check if a value is a Ref containing an array
 */
export function isRefArray<T = any>(
  value: any
): value is Ref<T[]> {
  return isVueRef(value, (val): val is T[] => Array.isArray(val));
}

/**
 * Type guard to check if a value is a Ref containing a string
 */
export function isRefString(value: any): value is Ref<string> {
  return isVueRef(value, (val): val is string => typeof val === 'string');
}

/**
 * Type guard to check if a value is a Ref containing a number
 */
export function isRefNumber(value: any): value is Ref<number> {
  return isVueRef(value, (val): val is number => typeof val === 'number');
}

/**
 * Type guard to check if a value is a Ref containing a boolean
 */
export function isRefBoolean(value: any): value is Ref<boolean> {
  return isVueRef(value, (val): val is boolean => typeof val === 'boolean');
}

/**
 * Generic type guard factory for specific object shapes
 * @param shapeValidator - Function that validates the object shape
 * @returns Type guard function for Ref<T>
 */
export function createRefTypeGuard<T>(
  shapeValidator: (val: any) => val is T
) {
  return (value: any): value is Ref<T> => {
    return isVueRef(value, shapeValidator);
  };
}

// Specific type validators for app types
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

// Pre-built type guards for common app types
export const isRefSchemaCollection = createRefTypeGuard(isSchemaCollection);
export const isRefTableDefinitionFields = createRefTypeGuard(
  (val: any): val is Array<{ fieldType: string; name?: string }> => 
    Array.isArray(val) && val.every(isTableDefinitionField)
);
export const isRefApiResponse = createRefTypeGuard(isApiResponse);