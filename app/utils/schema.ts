export function getForeignKeyColumnSet(definition: any[]): Set<string> {
  const set = new Set<string>();
  for (const field of definition) {
    if (field?.fieldType === "relation" && field.foreignKeyColumn) {
      set.add(field.foreignKeyColumn);
    }
  }
  return set;
}

export function getTargetTableName(
  relation: any,
  schemas?: Record<string, any>
): string | null {
  if (relation.targetTableName) return relation.targetTableName;
  if (typeof relation.targetTable === "string") return relation.targetTable;
  if (typeof relation.targetTable === "number" && schemas) {
    const targetSchema = Object.values(schemas).find(
      (s: any) => s.id === relation.targetTable
    );
    return (targetSchema as any)?.name || null;
  }
  if (relation.targetTable && typeof relation.targetTable === "object" && schemas) {
    if (typeof relation.targetTable.name === "string") {
      return relation.targetTable.name;
    }
    const tid = relation.targetTable.id;
    if (tid != null) {
      const targetSchema = Object.values(schemas).find(
        (s: any) => s.id === tid
      );
      return (targetSchema as any)?.name || null;
    }
  }
  return null;
}