import { resolvePublicApiUrl } from '~/utils/enfyra/runtime/api-url'

describe('resolvePublicApiUrl', () => {
  it('uses the Nuxt runtime override instead of the build-time API_URL default', () => {
    expect(resolvePublicApiUrl({
      API_URL: 'http://build-time-api:1105/',
      NUXT_PUBLIC_API_URL: 'http://runtime-api:1105/',
    })).toBe('http://runtime-api:1105')
  })
})
