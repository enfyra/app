import type { BadgeProps } from '@nuxt/ui';
import type { CellContext } from '@tanstack/vue-table';
import type { VNodeChild } from 'vue';

export interface SelectionColumnOptions {
  multiple?: boolean;
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
