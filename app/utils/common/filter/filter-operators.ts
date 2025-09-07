export const FILTER_OPERATORS = {
  string: [
    { value: "_eq", label: "Equals" },
    { value: "_neq", label: "Not equals" },
    { value: "_contains", label: "Contains" },
    { value: "_starts_with", label: "Starts with" },
    { value: "_ends_with", label: "Ends with" },
    { value: "_is_null", label: "Is null" },
  ],
  number: [
    { value: "_eq", label: "Equals" },
    { value: "_neq", label: "Not equals" },
    { value: "_gt", label: "Greater than" },
    { value: "_gte", label: "Greater than or equal" },
    { value: "_lt", label: "Less than" },
    { value: "_lte", label: "Less than or equal" },
    { value: "_between", label: "Between" },
    { value: "_in", label: "One of" },
    { value: "_not_in", label: "Not one of" },
    { value: "_is_null", label: "Is null" },
  ],
  boolean: [
    { value: "_eq", label: "Equals" },
    { value: "_neq", label: "Not equals" },
    { value: "_is_null", label: "Is null" },
  ],
  date: [
    { value: "_eq", label: "Equals" },
    { value: "_neq", label: "Not equals" },
    { value: "_gt", label: "After" },
    { value: "_gte", label: "On or after" },
    { value: "_lt", label: "Before" },
    { value: "_lte", label: "On or before" },
    { value: "_between", label: "Between" },
    { value: "_is_null", label: "Is null" },
  ],
  select: [
    { value: "_eq", label: "Equals" },
    { value: "_neq", label: "Not equals" },
    { value: "_in", label: "One of" },
    { value: "_not_in", label: "Not one of" },
    { value: "_is_null", label: "Is null" },
  ],
};

export function getOperatorsByType(type: string) {
  return FILTER_OPERATORS[type as keyof typeof FILTER_OPERATORS] || FILTER_OPERATORS.string;
}

export function mapDbTypeToFilterType(dbType: string): string {
  switch (dbType.toLowerCase()) {
    case "int":
    case "bigint":
    case "decimal":
    case "float":
    case "double":
      return "number";
    case "boolean":
      return "boolean";
    case "date":
    case "datetime":
    case "timestamp":
      return "date";
    case "enum":
      return "select";
    default:
      return "string";
  }
}

export function needsValue(operator: string): boolean {
  return !["_is_null"].includes(operator);
}

export function needsTwoValues(operator: string): boolean {
  return ["_between"].includes(operator);
}

export function generateFilterId(): string {
  return Math.random().toString(36).substring(2, 9);
}