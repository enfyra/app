import { stableStringify } from '~/utils/common/stable-stringify'

describe('stableStringify', () => {
  it('sorts object keys consistently', () => {
    const a = { b: 1, a: 2 }
    const b = { a: 2, b: 1 }

    expect(stableStringify(a)).toBe(stableStringify(b))
    expect(stableStringify(a)).toBe('{"a":2,"b":1}')
  })

  it('sorts nested object keys but preserves array order', () => {
    expect(
      stableStringify({
        nested: { z: 1, a: 2 },
        items: [{ b: 2, a: 1 }, { c: 3, a: 1 }],
      }),
    ).toBe(
      '{"items":[{"a":1,"b":2},{"a":1,"c":3}],"nested":{"a":2,"z":1}}',
    )
  })
})
