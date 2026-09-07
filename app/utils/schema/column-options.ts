type ColumnOptionsState = {
  type?: string;
  options?: unknown;
};

export function parseColumnOptions(options: unknown): string[] {
  if (Array.isArray(options)) return options.map(String);
  if (typeof options !== "string") return [];
  const trimmed = options.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {}
  const braceMatch = trimmed.match(/^\{(.*)\}$/);
  if (!braceMatch) return [];
  return (braceMatch[1] ?? "")
    .split(",")
    .map((option) => option.trim().replace(/^"|"$/g, ""));
}

export function normalizeColumnOptions<T extends ColumnOptionsState>(column: T): T {
  if (column.type !== "enum" && column.type !== "array-select") {
    delete column.options;
    return column;
  }
  column.options = [
    ...new Set(
      parseColumnOptions(column.options)
        .map((option) => option.trim())
        .filter(Boolean),
    ),
  ];
  return column;
}

export function validateColumnOptions(
  type: unknown,
  options: unknown,
): string | null {
  if (type !== "enum" && type !== "array-select") return null;
  return parseColumnOptions(options).some((option) => option.trim())
    ? null
    : "At least one option is required";
}
