import type { ColumnDef } from "@tanstack/vue-table";
import { UBadge, UDropdownMenu, UButton, UIcon, UTooltip } from "#components";

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
    options?: any,
  ) {
    if (value === null || value === undefined) {
      return h("span", { class: "text-[var(--text-quaternary)] select-none" }, "—");
    }

    switch (format) {
      case "date":
        return h("span", { class: "text-[var(--text-secondary)] tabular-nums" },
          new Date(value).toLocaleDateString("en-US", options?.dateFormat || { month: "short", day: "numeric", year: "numeric" })
        );

      case "datetime":
        return renderDatetime(value);

      case "currency":
        return h("span", { class: "tabular-nums font-medium" },
          new Intl.NumberFormat("en-US", { style: "currency", currency: options?.currency || "USD" }).format(value)
        );

      case "filesize":
        return h("span", { class: "tabular-nums text-[var(--text-secondary)]" }, formatFilesize(Number(value) || 0));

      case "badge":
        return h(UBadge, {
          color: options?.badgeColor?.(value) ?? "neutral",
          variant: options?.badgeVariant ?? "soft",
          label: options?.badgeMap?.[String(value)] ?? String(value),
        });

      case "boolean":
        return renderBoolean(value);

      case "id":
        return renderId(value);

      case "number":
        return h("span", { class: "tabular-nums text-[var(--text-primary)] font-medium" }, String(value));

      case "json":
        return renderJson(value);

      case "text-long":
        return renderLongText(value);

      case "custom":
        return options?.formatter ? options.formatter(value, row) : value;

      default:
        return value;
    }
  }

  function renderBoolean(value: any) {
    const isTrue = Boolean(value);
    return h("span", {
      class: [
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none",
        isTrue
          ? "bg-[var(--success-surface)] text-[var(--success-on-surface)] border border-[var(--success-border-soft)]"
          : "bg-[var(--surface-muted)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]",
      ],
    }, [
      h("span", {
        class: [
          "h-1.5 w-1.5 rounded-full shrink-0",
          isTrue ? "bg-[var(--success-color)]" : "bg-[var(--text-quaternary)]",
        ],
      }),
      isTrue ? "true" : "false",
    ]);
  }

  function renderId(value: any) {
    const str = String(value);
    const display = str.length > 12 ? `${str.slice(0, 8)}…${str.slice(-4)}` : str;
    return h(UTooltip, { text: str }, {
      default: () => h("code", {
        class: "text-xs font-mono text-[var(--text-secondary)] bg-[var(--surface-muted)] px-1.5 py-0.5 rounded cursor-default",
      }, display),
    });
  }

  function renderDatetime(value: any) {
    const date = new Date(value);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    let relative: string;
    if (diffMin < 1) relative = "just now";
    else if (diffMin < 60) relative = `${diffMin}m ago`;
    else if (diffHr < 24) relative = `${diffHr}h ago`;
    else if (diffDay < 30) relative = `${diffDay}d ago`;
    else relative = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined });

    const absolute = date.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    return h(UTooltip, { text: absolute }, {
      default: () => h("span", {
        class: "text-[var(--text-secondary)] tabular-nums cursor-default whitespace-nowrap",
      }, relative),
    });
  }

  function renderJson(value: any) {
    let str: string;
    try {
      str = typeof value === "string" ? value : JSON.stringify(value);
    } catch {
      str = String(value);
    }
    const truncated = str.length > 40 ? str.slice(0, 40) + "…" : str;
    return h(UTooltip, { text: str.length > 200 ? str.slice(0, 200) + "…" : str }, {
      default: () => h("code", {
        class: "text-xs font-mono text-[var(--text-tertiary)] bg-[var(--surface-muted)] px-1.5 py-0.5 rounded max-w-[200px] truncate inline-block align-middle",
      }, truncated),
    });
  }

  function renderLongText(value: any) {
    const str = String(value);
    if (str.length <= 60) return h("span", { class: "text-[var(--text-primary)]" }, str);
    return h(UTooltip, { text: str }, {
      default: () => h("span", {
        class: "text-[var(--text-primary)] truncate block max-w-[300px]",
      }, str),
    });
  }

  function formatFilesize(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  return {
    buildColumn,
    buildActionsColumn,
    formatCellValue,
  };
}
