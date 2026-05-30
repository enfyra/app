import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'

import SidebarUserInfo from '~/components/sidebar/UserInfo.vue'
import { useAuth } from '~/composables/shared/useAuth'

vi.mock('~/composables/shared/useConfirm', () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(false) }),
}))

describe('SidebarUserInfo', () => {
  it('expands account actions inline instead of rendering a dropdown menu', async () => {
    const { me } = useAuth()
    me.value = { id: 'user-1', email: 'dothinh115@gmail.com' } as any

    const wrapper = await mountSuspended(SidebarUserInfo, {
      route: '/data/cloud_email_senders',
      props: { collapsed: false },
    })

    expect(wrapper.findComponent({ name: 'UDropdownMenu' }).exists()).toBe(false)
    expect(wrapper.get('button[aria-expanded="false"]')).toBeTruthy()
    expect(wrapper.html()).toContain('grid-rows-[0fr]')

    await wrapper.get('button[aria-expanded="false"]').trigger('click')

    expect(wrapper.get('button[aria-expanded="true"]')).toBeTruthy()
    expect(wrapper.findAll('button[aria-expanded]').length).toBe(1)
    expect(wrapper.html()).toContain('grid-rows-[1fr]')
    expect(wrapper.text()).toContain('dothinh115@gmail.com')
    expect(wrapper.text().match(/dothinh115@gmail\.com/g)?.length).toBe(1)
    expect(wrapper.text().match(/Account/g)?.length).toBe(1)
    expect(wrapper.text()).toContain('Account')
    expect(wrapper.text()).toContain('Profile')
    expect(wrapper.text()).toMatch(/Light|Dark/)
    expect(wrapper.text()).toContain('Logout')
  })
})
