import type { TableDefinitionField } from '~/types/database';

export type FormEditorVirtualEmitPayload = {
  key: string;
  event?: string;
  data?: unknown;
};

export type FormEditorVirtualField = TableDefinitionField & {
  name: string;
};

export type FormEditorSection = {
  id: string;
  title?: string;
  hideHeading?: boolean;
  headingClass?: string;
  class?: string;
  rootClass?: string;
  fields: string[];
};
