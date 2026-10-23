import type { InjectionKey } from 'vue';

import type { FormEditorVirtualEmitPayload } from '~/types/form-editor';

export const FORM_EDITOR_VIRTUAL_EMIT_KEY: InjectionKey<
  (payload: FormEditorVirtualEmitPayload) => void
> = Symbol('formEditorVirtualEmit');

export const FORM_EDITOR_DRAFT_ERROR_KEY: InjectionKey<
  (key: string, error: string | null) => void
> = Symbol('formEditorDraftError');
