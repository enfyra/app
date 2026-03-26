interface FormEditorActions {
  validateAllUniqueFields: () => Promise<boolean>;
  confirmChanges: () => void;
  getUniqueFieldsNeedingCheck: () => string[];
}

export function useFormEditorRegistry() {
  return useState<FormEditorActions | null>('__formEditorRegistry', () => null);
}
