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
  return null;
}