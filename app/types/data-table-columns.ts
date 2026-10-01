export interface DataTableColumnConfig {
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
  cell?: (props: { row: any; getValue: () => any }) => any;
  format?: "date" | "datetime" | "currency" | "filesize" | "badge" | "boolean" | "id" | "number" | "json" | "text-long" | "custom";
  formatOptions?: {
    dateFormat?: Intl.DateTimeFormatOptions;
    currency?: string;
    badgeColor?: (value: any) => string;
    badgeVariant?: "soft" | "solid" | "outline";
    badgeMap?: Record<string, string>;
    formatter?: (value: any, row: any) => string;
  };
}

export interface DataTableRowAction {
  label: string;
  icon: string;
  color?: string;
  class?: string;
  disabled?: boolean;
  show?: (row: any) => boolean;
  onSelect: (row: any) => void | Promise<void>;
}

export interface DataTableActionsConfig {
  actions?: DataTableRowAction[] | ((row: any) => DataTableRowAction[]);
  inlineEdit?: {
    enabled: boolean;
    field: string;
    onSave: (rowId: string, value: string) => Promise<void>;
    validation?: (value: string) => string | null;
  };
  width?: number;
}
