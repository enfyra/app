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
  })

  it('rejects unsupported operators and macros with path-aware errors', () => {
    expect(
      validateFieldPermissionCondition({
        ownerId: { _neq: '@USER.email' },
      }),
    ).toEqual({
      ok: false,
      errors: [
        'ownerId._neq operator is not supported',
        'ownerId._neq macro is not supported',
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
