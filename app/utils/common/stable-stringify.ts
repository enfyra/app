export function stableStringify(val: any): string {
  return JSON.stringify(val, (_key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((acc: Record<string, any>, k) => {
        acc[k] = value[k];
        return acc;
      }, {});
    }
    return value;
  });
}
