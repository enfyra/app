import { validateFieldPermissionScope } from '~/utils/field-permissions/scope'

describe('field permission scope validation', () => {
  it('accepts role-only and user-only scopes', () => {
    expect(validateFieldPermissionScope({ role: { id: 1 } })).toEqual({ ok: true })
    expect(validateFieldPermissionScope({ allowedUsers: [{ _id: 'u1' }] })).toEqual({ ok: true })
  })

  it('rejects mixed role and users', () => {
    expect(
      validateFieldPermissionScope({
        role: { id: 1 },
        allowedUsers: [{ id: 2 }],
      }),
    ).toEqual({
      ok: false,
      message: 'Choose either role or user (not both)',
    })
  })

  it('rejects missing scope selection', () => {
    expect(validateFieldPermissionScope({})).toEqual({
      ok: false,
      message: 'You must select a role or a user',
    })
  })

  it('treats any valid user in allowedUsers as a selected user scope', () => {
    expect(
      validateFieldPermissionScope({
        allowedUsers: [{}, { id: 2 }],
      }),
    ).toEqual({ ok: true })
  })
})
