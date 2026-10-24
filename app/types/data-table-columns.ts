import type { BadgeProps } from '@nuxt/ui';
import type { CellContext, HeaderContext, Row, Table } from '@tanstack/vue-table';
import type { VNode, VNodeChild } from 'vue';

export interface DataTableInstance<TRow extends object> {
  tableApi?: Table<TRow>;
  tableRef?: HTMLElement;
}

export type DataTableSlots<TRow extends object> = {
  [name in `${string}-cell`]?: (props: CellContext<TRow, unknown>) => VNode[];
} & {
  [name in `${string}-header` | `${string}-footer`]?: (props: HeaderContext<TRow, unknown>) => VNode[];
} & {
  expanded?: (props: { row: Row<TRow> }) => VNode[];
  empty?: (props: {}) => VNode[];
  loading?: (props: {}) => VNode[];
  caption?: (props: {}) => VNode[];
  'body-top'?: (props: {}) => VNode[];
  'body-bottom'?: (props: {}) => VNode[];
  toolbar?: (props: { tableApi: Table<TRow> | undefined }) => VNode[];
  'toolbar-actions'?: (props: { tableApi: Table<TRow> | undefined }) => VNode[];
  footer?: (props: { tableApi: Table<TRow> | undefined }) => VNode[];
  'pagination-summary'?: (props: { tableApi: Table<TRow> | undefined }) => VNode[];
};

export interface SelectionColumnOptions {
  multiple?: boolean;
  disabled?: boolean;
}

export type DataTableCellFormat = "date" | "datetime" | "currency" | "filesize" | "badge" | "boolean" | "id" | "number" | "json" | "text-long" | "custom";

export interface DataTableFormatOptions<TRow = Record<string, unknown>> {
  dateFormat?: Intl.DateTimeFormatOptions;
  currency?: string;
  badgeColor?: (value: unknown) => BadgeProps['color'];
  badgeVariant?: "soft" | "solid" | "outline";
  badgeMap?: Record<string, string>;
  formatter?: (value: unknown, row: TRow) => string;
}

export interface DataTableColumnConfig<TRow = Record<string, unknown>> {
  id: string;
  accessorKey?: string;
  header: string;
  columnType?: string;
  sortable?: boolean;
  hideable?: boolean;
  resizable?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  cell?: (props: CellContext<TRow, unknown>) => VNodeChild;
  format?: DataTableCellFormat;
  formatOptions?: DataTableFormatOptions<TRow>;
}

export interface DataTableRowAction<TRow = Record<string, unknown>> {
  label: string;
  icon: string;
  color?: string;
  class?: string;
  disabled?: boolean;
  show?: (row: TRow) => boolean;
  onSelect: (row: TRow) => void | Promise<void>;
}

export interface DataTableActionsConfig<TRow = Record<string, unknown>> {
  actions?: DataTableRowAction<TRow>[] | ((row: TRow) => DataTableRowAction<TRow>[]);
  inlineEdit?: {
    enabled: boolean;
    field: string;
    onSave: (rowId: string, value: string) => Promise<void>;
    validation?: (value: string) => string | null;
  };
  width?: number;
}
