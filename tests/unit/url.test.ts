import { normalizeUrl } from '~/utils/api/url'

describe('normalizeUrl', () => {
  it('joins url segments without duplicate slashes', () => {
    expect(normalizeUrl('https://api.example.com/', '/auth/', '/refresh-token')).toBe(
      'https://api.example.com/auth/refresh-token',
    )
  })

  it('ignores empty segments', () => {
    expect(normalizeUrl('', null, undefined, '/users')).toBe('/users')
    expect(normalizeUrl()).toBe('')
  })
})
