import {
  fieldPermissionConflictKey,
  fieldPermissionKey,
  normalizeFieldPermissionPayload,
  switchFieldPermissionScope,
} from '~/utils/field-permissions/normalize'

describe('field permission normalization', () => {
  it('uses Mongo _id as a stable identity', () => {
    expect(fieldPermissionKey({ _id: 'mongo-permission-1' })).toBe('id:mongo-permission-1')
  })

  it('strips client-only and legacy aliases while keeping the selected target', () => {
    expect(normalizeFieldPermissionPayload({
      id: 10,
      _tmpId: 'tmp-1',
      action: 'read',
      actions: ['read'],
      effect: 'deny',
      decision: 'allow',
      allowedUsers: [{ id: 8 }, { _id: 'mongo-user-9' }],
      table: { id: 99 },
      column: { id: 3 },
      relation: { id: 9 },
    }, 'column')).toEqual({
      id: 10,
      action: 'read',
      effect: 'deny',
      allowedUsers: [{ id: 8 }, { _id: 'mongo-user-9' }],
      column: { id: 3 },
    })
  })

  it('clears the opposite scope immediately when switching modes', () => {
    expect(switchFieldPermissionScope({
      role: { id: 7 },
      allowedUsers: [{ id: 8 }],
    }, 'user')).toEqual({
      role: null,
      allowedUsers: [{ id: 8 }],
    })
    expect(switchFieldPermissionScope({
      role: { id: 7 },
      allowedUsers: [{ id: 8 }],
    }, 'role')).toEqual({
      role: { id: 7 },
      allowedUsers: [],
    })
  })

  it('treats equivalent condition key order as the same duplicate rule', () => {
    expect(fieldPermissionConflictKey({
      action: 'read',
      effect: 'deny',
      role: { id: 7 },
      condition: { owner: { id: { _eq: 'x' } }, status: { _eq: 'open' } },
    })).toBe(fieldPermissionConflictKey({
      action: 'read',
      effect: 'deny',
      role: { id: 7 },
      condition: { status: { _eq: 'open' }, owner: { id: { _eq: 'x' } } },
    }))
  })
})
