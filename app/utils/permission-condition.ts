import type {
  PermissionCondition,
  PermissionRule,
} from "~/types/permissions";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPermissionRule(
  value: PermissionCondition | PermissionRule,
): value is PermissionRule {
  return "route" in value;
}

export function evaluatePermissionCondition(
  condition: PermissionCondition | PermissionRule | null | undefined,
  isRootAdmin: boolean,
  checkRule: (rule: PermissionRule) => boolean,
): boolean {
  if (isRootAdmin) return true;
  if (!condition || !isRecord(condition)) return false;
  if (isPermissionRule(condition)) return checkRule(condition);
  if (condition.rootAdmin === true) return false;
  if (condition.allowAll === true) return true;

  if (Array.isArray(condition.and)) {
    return (
      condition.and.length > 0 &&
      condition.and.every((item) =>
        evaluatePermissionCondition(item, false, checkRule),
      )
    );
  }

  if (Array.isArray(condition.or)) {
    return (
      condition.or.length > 0 &&
      condition.or.some((item) =>
        evaluatePermissionCondition(item, false, checkRule),
      )
    );
  }

  return false;
}

export function normalizePermissionCondition(
  condition: unknown,
): PermissionCondition | PermissionRule | null {
  if (!isRecord(condition)) return null;
  if ("route" in condition) {
    return condition as PermissionRule;
  }
  if (condition.allowAll === true) return { allowAll: true };
  if (condition.rootAdmin === true) return { rootAdmin: true };

  if (Array.isArray(condition.and)) {
    const items = condition.and
      .map(normalizePermissionCondition)
      .filter((item): item is PermissionCondition | PermissionRule => item !== null);
    return items.length > 0 ? { and: items } : null;
  }

  if (Array.isArray(condition.or)) {
    const items = condition.or
      .map(normalizePermissionCondition)
      .filter((item): item is PermissionCondition | PermissionRule => item !== null);
    return items.length > 0 ? { or: items } : null;
  }

  return null;
}
