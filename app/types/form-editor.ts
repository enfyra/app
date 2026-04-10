import type { TableDefinitionField } from '~/types/database';

export type FormEditorVirtualEmitPayload = {
  key: string;
  event?: string;
  data?: unknown;
};

export type FormEditorVirtualField = TableDefinitionField & {
  name: string;
};
