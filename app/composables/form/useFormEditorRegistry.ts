import type { FormEditorActions } from '~/types/form-validation';

export function useFormEditorRegistry() {
  return useState<FormEditorActions | null>('__formEditorRegistry', () => null);
}
