import { stableStringify } from "~/utils/common/stable-stringify";

const PROTECTED_PROFILE_FIELDS = new Set([
  "id",
  "_id",
  "email",
  "password",
  "isRootAdmin",
  "isSystem",
  "roles",
  "allowedRoutePermissions",
  "createdAt",
  "updatedAt",
]);

export function buildProfileUpdatePayload(
  current: Record<string, any>,
  original: Record<string, any>,
) {
  const payload: Record<string, any> = {};
  for (const [key, value] of Object.entries(current)) {
    if (PROTECTED_PROFILE_FIELDS.has(key)) continue;
    if (stableStringify(value) === stableStringify(original[key])) continue;
    payload[key] = value;
  }
  return payload;
}
