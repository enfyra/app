export interface FormEditorActions {
  validateAllUniqueFields: () => Promise<boolean>;
  confirmChanges: () => void;
  getUniqueFieldsNeedingCheck: () => string[];
  getDraftErrors?: () => Record<string, string>;
}

export type FormEditorLazyActions = Omit<FormEditorActions, 'validateAllUniqueFields'> & {
  validateAllUniqueFields: () => Promise<boolean> | undefined;
};
