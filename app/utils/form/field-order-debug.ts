export function debugFormEditorFieldOrder(payload: Record<string, unknown>): void {
  if (import.meta.dev) {
    console.debug('[FormEditor:fieldOrder]', payload);
  }
}

export function debugApplyFieldPositions(payload: Record<string, unknown>): void {
  if (import.meta.dev) {
    console.debug('[field-order:applyFieldPositions]', payload);
  }
}
