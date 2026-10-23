export interface FormEditorActions {
  validateAllUniqueFields: () => Promise<boolean>;
  confirmChanges: () => void;
  getUniqueFieldsNeedingCheck: () => string[];
  getDraftErrors?: () => Record<string, string>;
}
