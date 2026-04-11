import type { InjectionKey } from 'vue';

import type { FormEditorVirtualEmitPayload } from '~/types/form-editor';

export const FORM_EDITOR_VIRTUAL_EMIT_KEY: InjectionKey<
  (payload: FormEditorVirtualEmitPayload) => void
> = Symbol('formEditorVirtualEmit');

export function useFormEditorVirtualEmit() {
  return inject(FORM_EDITOR_VIRTUAL_EMIT_KEY, null);
}
