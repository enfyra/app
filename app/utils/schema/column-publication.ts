type ColumnPublicationState = {
  isNullable?: boolean;
  isPublished?: boolean;
};

export function normalizeColumnPublication<T extends ColumnPublicationState>(column: T): T {
  if (column.isPublished === false) {
    column.isNullable = true;
  }

  return column;
}
