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
      errors.push(...validateNode(v, [...path, key]));
      continue;
    }

    const v = node[key];
    if (isPlainObject(v)) {
      const ops = Object.keys(v);
      for (const op of ops) {
        if (op !== "_eq") {
          errors.push(`${[...path, key, op].join(".")} operator is not supported`);
          continue;
        }
        const val = v[op];
        if (typeof val === "string" && val.includes("@USER.") && val !== "@USER.id") {
          errors.push(`${[...path, key, op].join(".")} macro is not supported`);
        }
      }
      errors.push(...validateNode(v, [...path, key]));
      continue;
    }

    if (typeof v === "string" && v.includes("@USER.") && v !== "@USER.id") {
      errors.push(`${[...path, key].join(".")} macro is not supported`);
    }
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

