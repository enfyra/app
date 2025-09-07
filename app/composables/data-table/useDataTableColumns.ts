import type { ColumnDef } from "@tanstack/vue-table";
import { UBadge, UDropdownMenu, UButton } from "#components";

export interface DataTableColumnConfig {
  // Basic column properties
  id: string;
  accessorKey?: string;
  header: string;

  // Column behaviors
  sortable?: boolean;
  hideable?: boolean;
  resizable?: boolean;

  // Size constraints
  width?: number;
  minWidth?: number;
  maxWidth?: number;

  // Custom cell renderer
  cell?: (props: { row: any; getValue: () => any }) => any;

  // Format helpers for common types
  format?: "date" | "datetime" | "currency" | "filesize" | "badge" | "custom";
  formatOptions?: {
    // Date/datetime options
    dateFormat?: Intl.DateTimeFormatOptions;

    // Currency options
    currency?: string;

    // Badge options
    badgeColor?: (value: any) => string;
    badgeVariant?: "soft" | "solid" | "outline";
    badgeMap?: Record<string, string>;

    // Custom formatter function
    formatter?: (value: any, row: any) => string;
  };
}

export interface DataTableActionsConfig {
  // Dropdown actions
  actions?: Array<{
    label: string;
    icon: string;
    color?: string;
    class?: string;
    show?: (row: any) => boolean;
    onSelect: (row: any) => void;
  }>;

  // Inline editing
  inlineEdit?: {
    enabled: boolean;
    field: string;
    onSave: (rowId: string, value: string) => Promise<void>;
    validation?: (value: string) => string | null;
  };

  // Column width
  width?: number;
}

export function useDataTableColumns() {
  // Build column from config
  function buildColumn(config: DataTableColumnConfig): ColumnDef<any> {
    const column: ColumnDef<any> = {
      id: config.id,
      accessorKey: config.accessorKey || config.id,
      header: config.header,
      enableSorting: config.sortable !== false,
      enableHiding: config.hideable !== false,
      enableResizing: config.resizable !== false,
    };

    // Size constraints
    if (config.width) column.size = config.width;
    if (config.minWidth) column.minSize = config.minWidth;
    if (config.maxWidth) column.maxSize = config.maxWidth;

    // Custom cell renderer
    if (config.cell) {
      column.cell = config.cell;
    } else if (config.format) {
      column.cell = ({ getValue, row }) => {
        const value = getValue();
        return formatCellValue(
          value,
          row.original,
          config.format!,
          config.formatOptions
        );
      };
    }

    return column;
  }

  // Build actions column
  function buildActionsColumn(config: DataTableActionsConfig): ColumnDef<any> {
    return {
      id: "__actions",
      header: "",
      enableHiding: false,
      enableSorting: false,
      enableResizing: false,
      size: config.width || 50,
      maxSize: config.width || 50,
      minSize: config.width || 50,
      cell: ({ row }) => {
        const actions =
          config.actions?.filter(
            (action) => !action.show || action.show(row.original)
          ) || [];

        return h(
          "div",
          {
            class: "flex items-center justify-center",
            onClick: (e: Event) => e.stopPropagation(),
          },
          [
            actions.length > 0 &&
              h(
                UDropdownMenu as any,
                {
                  items: actions.map((action) => ({
                    ...action,
                    onSelect: () => action.onSelect(row.original),
                  })),
                },
                {
                  default: () =>
                    h(UButton, {
                      icon: "i-lucide-more-vertical",
                      size: "lg",
                      variant: "ghost",
                      color: "neutral",
                    }),
                }
              ),
          ]
        );
      },
    };
  }

  // Format cell value based on type
  function formatCellValue(
    value: any,
    row: any,
    format: string,
    options?: any
  ) {
    if (value === null || value === undefined) return "";

    switch (format) {
      case "date":
        return new Date(value).toLocaleDateString(
          "en-US",
          options?.dateFormat || {
            month: "short",
            day: "numeric",
            year: "numeric",
          }
        );

      case "datetime":
        return new Date(value).toLocaleDateString(
          "en-US",
          options?.dateFormat || {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }
        );

      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: options?.currency || "USD",
        }).format(value);

      case "filesize":
        const bytes = Number(value) || 0;
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;

      case "badge":
        const badgeText = options?.badgeMap?.[value] || value;
        const badgeColor = options?.badgeColor
          ? options.badgeColor(value)
          : "neutral";
        const badgeVariant = options?.badgeVariant || "soft";

        return h(
          UBadge,
          {
            color: badgeColor,
            variant: badgeVariant,
          },
          badgeText
        );

      case "custom":
        return options?.formatter ? options.formatter(value, row) : value;

      default:
        return value;
    }
  }

  return {
    buildColumn,
    buildActionsColumn,
    formatCellValue,
  };
}
