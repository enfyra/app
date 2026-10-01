import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import MePage from '~/pages/me.vue'

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }))

mockNuxtImport('$fetch', () => fetchMock)

describe('profile OAuth accounts', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockImplementation(async (path: string) => {
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
    })
  })

  it('loads linked accounts through the owner-scoped endpoint', async () => {
    const wrapper = await mountSuspended(MePage, {
      route: '/me?tab=profile',
      global: {
        stubs: {
          CommonEmptyState: true,
          CommonLoadingState: true,
          FormEditorLazy: true,
          ProfileApiTokensTable: true,
          ProfileChangePasswordForm: true,
          UForm: true,
          UIcon: true,
        },
      },
    })
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/me/oauth-accounts',
      expect.any(Object),
    )
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/enfyra_oauth_account',
      expect.any(Object),
    )
    expect(wrapper.find('a[href^="/settings/oauth"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
