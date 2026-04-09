function normalizeId(v: any): string | null {
  if (v == null) return null;
  if (typeof v === "object") return v.id ?? v._id ?? v.value ?? null;
  return String(v);
}

export function validateFieldPermissionScope(body: any): { ok: true } | { ok: false; message: string } {
  const roleId = normalizeId(body?.role);
  const users = body?.allowedUsers;
  const hasUser = Array.isArray(users) && users.length > 0 && !!normalizeId(users[0]);

  if (roleId && hasUser) {
    return { ok: false, message: "Choose either role or user (not both)" };
  }

  if (!roleId && !hasUser) {
    return { ok: false, message: "You must select a role or a user" };
  }

  return { ok: true };
}

