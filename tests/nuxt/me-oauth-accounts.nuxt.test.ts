import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import MePage from '~/pages/me.vue'

describe('profile OAuth accounts', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('$fetch', vi.fn(async (path: string) => {
      if (path === '/api/me') {
        return {
          data: [{ id: 'user-1', email: 'user@example.test' }],
        }
      }
      if (path === '/api/me/oauth-accounts') {
        return {
          data: [{ id: 'oauth-1', provider: 'google' }],
        }
      }
      return { data: [] }
    }))
  })

  it('loads linked accounts through the owner-scoped endpoint', async () => {
    await mountSuspended(MePage, {
      route: '/me',
      global: {
        stubs: {
          CommonEmptyState: true,
          CommonLoadingState: true,
          FormEditorLazy: true,
          ProfileApiTokensCard: true,
          ProfileChangePasswordModal: true,
          UForm: true,
          UIcon: true,
        },
      },
    })
    await flushPromises()

    const fetchMock = vi.mocked($fetch)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/me/oauth-accounts',
      expect.any(Object),
    )
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/enfyra_oauth_account',
      expect.any(Object),
    )
  })
})
