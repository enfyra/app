import { buildApiProxyTarget } from '~/utils/enfyra/server/proxy'

describe('buildApiProxyTarget', () => {
  it('joins the API base and raw request path without rewriting query values', () => {
    expect(
      buildApiProxyTarget(
        'http://localhost:1105/',
        '/cloud/debug/request-context?redirect=https://example.com/a//b&x=a%2F%2Fb',
      ),
    ).toBe(
      'http://localhost:1105/cloud/debug/request-context?redirect=https://example.com/a//b&x=a%2F%2Fb',
    )
  })

  it('keeps raw repeated slashes in the path for backend route semantics', () => {
    expect(buildApiProxyTarget('http://localhost:1105/', '/api-like//path?q=one//two')).toBe(
      'http://localhost:1105/api-like//path?q=one//two',
    )
  })
})
