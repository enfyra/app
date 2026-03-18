import type { FilterGroup, FieldOption } from "./filter-types";
import { getTargetTableName } from "~/utils/schema";

export function getTargetTableNameForGroup(
  group: FilterGroup,
  schemas: Record<string, any>,
  rootTableName: string
): string {
  if (!group.relationContext) return rootTableName;

  const relationPath = group.relationContext.split(".");
  let currentTable = rootTableName;

  for (const relationName of relationPath) {
    const currentSchema = schemas[currentTable];
    const relation = currentSchema?.definition?.find(
      (f: any) => f.fieldType === "relation" && f.name === relationName
    );

    if (!relation) return rootTableName;

    const targetTableName = getTargetTableName(relation, schemas);
    if (!targetTableName) return rootTableName;

    currentTable = targetTableName;
  }

  return currentTable;
}

export function getCombinedOptionsForContext(
  contextTableName: string,
  schemas: Record<string, any>
): FieldOption[] {
  const schema = schemas[contextTableName];
  if (!schema?.definition) return [];

  const options: FieldOption[] = [];
  const systemFields: FieldOption[] = [];

  schema.definition
    .filter((f: any) => f.fieldType === "column" && !f.isHidden)
    .forEach((f: any) => {
      const option: FieldOption = {
        label: f.name,
        value: f.name,
        fieldCategory: "column",
        fieldType: f.type,
      };
      ["createdAt", "updatedAt"].includes(f.name)
        ? systemFields.push(option)
        : options.push(option);
    });

  schema.definition
    .filter((f: any) => f.fieldType === "relation")
    .forEach((r: any) => {
      const targetTableName = getTargetTableName(r, schemas);
      options.push({
        label: `${r.name} → (${targetTableName || "unknown"})`,
        value: r.name,
        fieldCategory: "relation",
        targetTable: targetTableName ?? undefined,
      });
    });

  return [...options, ...systemFields];
}

export function getFieldOptions(
  fieldKey: string,
  contextTableName: string,
  schemas: Record<string, any>
): Array<{ label: string; value: any }> {
  const schema = schemas[contextTableName];
  if (!schema?.definition) return [];

  const fieldName = fieldKey.includes(".") ? fieldKey.split(".").pop() : fieldKey;
  const field = schema.definition.find(
    (f: any) => f.fieldType === "column" && f.name === fieldName
  );

  return field?.type === "enum" && field.options
    ? field.options.map((opt: string) => ({ label: opt, value: opt }))
    : [];
}