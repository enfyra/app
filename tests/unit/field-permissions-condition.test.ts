import { parseConditionJson, validateFieldPermissionCondition } from '~/utils/field-permissions/condition'

describe('field permission condition helpers', () => {
  it('parses empty input as null condition without error', () => {
    expect(parseConditionJson('')).toEqual({ condition: null, error: null })
    expect(parseConditionJson('   ')).toEqual({ condition: null, error: null })
  })

  it('returns a friendly error for invalid json', () => {
    expect(parseConditionJson('{oops')).toEqual({
      condition: null,
      error: 'Condition must be valid JSON',
    })
  })

  it('keeps parsed scalar values unvalidated until condition validation', () => {
    for (const input of ['true', '42', '"not a condition"']) {
      const parsed = parseConditionJson(input)
      expect(parsed.error).toBeNull()
      expect(validateFieldPermissionCondition(parsed.condition)).toEqual({
        ok: false,
        errors: ['condition must be an object'],
      })
    }
  })

  it('rejects empty nested groups and preserves dynamic comparison operands', () => {
    expect(validateFieldPermissionCondition({ _and: [{ _or: [] }] })).toEqual({
      ok: false,
      errors: ['_and.0._or must not be empty'],
    })
    expect(validateFieldPermissionCondition({ payload: { _eq: { dynamic: ['value', 0, false, null] } } })).toEqual({
      ok: true,
      errors: [],
    })
  })

  it('accepts null and supported @USER.id equality conditions', () => {
    expect(validateFieldPermissionCondition(null)).toEqual({
      ok: true,
      errors: [],
    })

    expect(
      validateFieldPermissionCondition({
        ownerId: { _eq: '@USER.id' },
      }),
    ).toEqual({
      ok: true,
      errors: [],
    })

    expect(
      validateFieldPermissionCondition({
        owner: { id: { _eq: '@USER.id' } },
      }),
    ).toEqual({
      ok: true,
      errors: [],
    })
  })

  it('rejects unsupported operators and macros with path-aware errors', () => {
    expect(
      validateFieldPermissionCondition({
        ownerId: { _equals: '@USER.id' },
      }),
    ).toEqual({
      ok: false,
      errors: [
        'ownerId._equals operator is not supported',
      ],
    })

    expect(
      validateFieldPermissionCondition({
        ownerId: { _eq: '@USER.email' },
      }),
    ).toEqual({
      ok: false,
      errors: [
        'ownerId._eq macro is not supported',
      ],
    })
  })

  it('rejects invalid logical groups and non-object children', () => {
    expect(
      validateFieldPermissionCondition({
        _and: ['bad'],
      }),
    ).toEqual({
      ok: false,
      errors: ['_and.0 must be an object'],
    })

    expect(
      validateFieldPermissionCondition({
        _or: {},
      }),
    ).toEqual({
      ok: false,
      errors: ['_or must be an array'],
    })
  })
})
