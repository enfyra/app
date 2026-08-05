const anonymousKeys = new WeakMap<object, string>()
let anonymousKeySequence = 0

function stableValue(value: any): any {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== "object") return value ?? null
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])]),
  )
}

export function fieldPermissionKey(permission: any): string {
  const id = permission?.id ?? permission?._id
  if (id != null && id !== '') return `id:${String(id)}`
  if (permission?._tmpId) return `tmp:${String(permission._tmpId)}`
  if (permission && typeof permission === 'object') {
    const existing = anonymousKeys.get(permission)
    if (existing) return existing
    const next = `anon:${++anonymousKeySequence}`
    anonymousKeys.set(permission, next)
    return next
  }
  return 'anon:empty'
}

export function normalizeFieldPermissionPayload(permission: any, targetType: 'column' | 'relation') {
  const body = { ...(permission || {}) }
  if (body.action == null && body.actions != null) {
    body.action = Array.isArray(body.actions) ? body.actions[0] : body.actions
  }
  if (body.effect == null && body.decision != null) body.effect = body.decision
  delete body._tmpId
  delete body.actions
  delete body.decision
  delete body.table
  if (targetType === 'column') delete body.relation
  else delete body.column
  return body
}

export function switchFieldPermissionScope(form: any, mode: 'role' | 'user') {
  return {
    ...(form || {}),
    role: mode === 'role' ? (form?.role ?? null) : null,
    allowedUsers: mode === 'user' ? (Array.isArray(form?.allowedUsers) ? form.allowedUsers : []) : [],
  }
}

export function fieldPermissionConflictKey(permission: any): string {
  const roleId = permission?.role?.id ?? permission?.role?._id ?? permission?.role
  const users = Array.isArray(permission?.allowedUsers)
    ? permission.allowedUsers.map((user: any) => String(user?.id ?? user?._id ?? user)).sort()
    : []
  return JSON.stringify({
    action: permission?.action ?? permission?.actions ?? null,
    effect: permission?.effect ?? permission?.decision ?? null,
    roleId: roleId == null ? null : String(roleId),
    users,
    condition: stableValue(permission?.condition ?? null),
  })
}
