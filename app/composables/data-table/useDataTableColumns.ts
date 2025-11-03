import type { ColumnDef } from "@tanstack/vue-table";
import { UBadge, UDropdownMenu, UButton } from "#components";

export interface DataTableColumnConfig {
  id: string;
  accessorKey?: string;
  header: string;

  sortable?: boolean;
  hideable?: boolean;
  resizable?: boolean;

  width?: number;
  minWidth?: number;
  maxWidth?: number;

  cell?: (props: { row: any; getValue: () => any }) => any;

  format?: "date" | "datetime" | "currency" | "filesize" | "badge" | "custom";
  formatOptions?: {
    dateFormat?: Intl.DateTimeFormatOptions;

    currency?: string;

    badgeColor?: (value: any) => string;
    badgeVariant?: "soft" | "solid" | "outline";
    badgeMap?: Record<string, string>;

    formatter?: (value: any, row: any) => string;
  };
}

export interface DataTableActionsConfig {
  actions?: Array<{
    label: string;
    icon: string;
    color?: string;
    class?: string;
    show?: (row: any) => boolean;
    onSelect: (row: any) => void;
  }>;

  inlineEdit?: {
    enabled: boolean;
    field: string;
    onSave: (rowId: string, value: string) => Promise<void>;
    validation?: (value: string) => string | null;
  };

  width?: number;
}

export function useDataTableColumns() {
  function buildColumn(config: DataTableColumnConfig): ColumnDef<any> {
    const column: ColumnDef<any> = {
      id: config.id,
      accessorKey: config.accessorKey || config.id,
      header: config.header,
      enableSorting: config.sortable !== false,
      enableHiding: config.hideable !== false,
      enableResizing: config.resizable !== false,
    };

    if (config.width) column.size = config.width;
    if (config.minWidth) column.minSize = config.minWidth;
    if (config.maxWidth) column.maxSize = config.maxWidth;

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
                      icon: "lucide:ellipsis-vertical",
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
