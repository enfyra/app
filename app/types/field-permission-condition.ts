export type FieldPermissionCondition = Record<string, unknown> | null;

export type FieldPermissionConditionParseResult =
  | { condition: unknown; error: null }
  | { condition: null; error: string };

export type FieldPermissionConditionValidationResult =
  | { ok: true; errors: [] }
  | { ok: false; errors: string[] };
