import type { FilterGroup, FieldOption } from "./filter-types";

export function getTargetTableNameForGroup(
  group: FilterGroup,
  schemas: Record<string, any>,
  rootTableName: string
): string {
  if (!group.relationContext) {
    return rootTableName;
  }

  const relationPath = group.relationContext.split(".");
  let currentTable = rootTableName;

  for (const relationName of relationPath) {
    const currentSchema = schemas[currentTable];
    const relation = currentSchema?.definition?.find(
      (f: any) => f.fieldType === "relation" && f.name === relationName
    );

    if (!relation) {
      return rootTableName;
    }

    let targetTableName = relation.targetTable?.name;

    if (!targetTableName && relation.targetTable?.id) {
      const targetTable = Object.values(schemas).find(
        (schema: any) => schema.id === relation.targetTable.id
      );
      targetTableName = (targetTable as any)?.name;
    }

    if (!targetTableName) {
      return rootTableName;
    }

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

  const columns = schema.definition
    .filter((field: any) => field.fieldType === "column" && !field.isHidden);

  columns.forEach((field: any) => {
    const option: FieldOption = {
      label: field.name,
      value: field.name,
      fieldCategory: "column",
      fieldType: field.type,
    };

    if (["createdAt", "updatedAt"].includes(field.name)) {
      systemFields.push(option);
    } else {
      options.push(option);
    }
  });

  const relations = schema.definition
    .filter((field: any) => field.fieldType === "relation");

  relations.forEach((relation: any) => {
    let targetTableName = relation.targetTable?.name;
    if (!targetTableName && relation.targetTable?.id) {
      const targetTable = Object.values(schemas).find(
        (s: any) => s.id === relation.targetTable.id
      );
      targetTableName = (targetTable as any)?.name;
    }

    options.push({
      label: `${relation.name} → (${targetTableName || "unknown"})`,
      value: relation.name,
      fieldCategory: "relation",
      targetTable: targetTableName,
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

  const fieldName = fieldKey.includes(".")
    ? fieldKey.split(".").pop()
    : fieldKey;
  const field = schema.definition.find(
    (f: any) => f.fieldType === "column" && f.name === fieldName
  );

  if (field?.type === "enum" && field.options) {
    return field.options.map((opt: string) => ({ label: opt, value: opt }));
  }

  return [];
}
