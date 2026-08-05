export type FieldPermissionCondition = Record<string, any> | null;

function isPlainObject(value: any): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validateNode(node: any, path: string[]): string[] {
  if (node == null) return [];

  if (Array.isArray(node)) {
    return node.flatMap((v, i) => validateNode(v, [...path, String(i)]));
  }

  if (!isPlainObject(node)) {
    return [`${path.join(".") || "condition"} must be an object`];
  }

  const keys = Object.keys(node);
  const errors: string[] = [];

  for (const key of keys) {
    if (key === "_and" || key === "_or") {
      const v = node[key];
      if (!Array.isArray(v)) {
        errors.push(`${[...path, key].join(".")} must be an array`);
        continue;
      }
      if (v.length === 0) {
        errors.push(`${[...path, key].join(".")} must not be empty`);
        continue;
      }
      errors.push(...validateNode(v, [...path, key]));
      continue;
    }

    if (key === "_not") {
      if (!isPlainObject(node[key])) {
        errors.push(`${[...path, key].join(".")} must be an object`);
        continue;
      }
      errors.push(...validateNode(node[key], [...path, key]));
      continue;
    }

    if (key.startsWith("_")) {
      errors.push(`${[...path, key].join(".")} operator is not supported`);
      continue;
    }

    const v = node[key];
    if (isPlainObject(v)) {
      const ops = Object.keys(v);
      const operators = new Set([
        "_eq", "_neq", "_gt", "_gte", "_lt", "_lte", "_in", "_not_in", "_nin", "_is_null", "_is_not_null",
      ]);
      const isOperatorNode = ops.length > 0 && ops.every((op) => op.startsWith("_"));
      if (!isOperatorNode) {
        errors.push(...validateNode(v, [...path, key]));
        continue;
      }
      for (const op of ops) {
        if (!operators.has(op)) {
          errors.push(`${[...path, key, op].join(".")} operator is not supported`);
          continue;
        }
        const val = v[op];
        if ((op === "_in" || op === "_not_in" || op === "_nin") && !Array.isArray(val) && typeof val !== "string") {
          errors.push(`${[...path, key, op].join(".")} must be an array or user macro`);
        }
        if (typeof val === "string" && val.startsWith("@USER.") && !["@USER.id", "@USER._id"].includes(val)) {
          errors.push(`${[...path, key, op].join(".")} macro is not supported`)
        }
      }
      continue;
    }

    errors.push(`${[...path, key].join(".")} must be an operator object`);
  }

  return errors;
}

export function parseConditionJson(input: string): {
  condition: FieldPermissionCondition;
  error: string | null;
} {
  const trimmed = (input || "").trim();
  if (!trimmed) return { condition: null, error: null };

  try {
    const parsed = JSON.parse(trimmed);
    return { condition: parsed, error: null };
  } catch {
    return { condition: null, error: "Condition must be valid JSON" };
  }
}

export function validateFieldPermissionCondition(condition: FieldPermissionCondition): {
  ok: boolean;
  errors: string[];
} {
  const errors = validateNode(condition, []);
  return { ok: errors.length === 0, errors };
}
