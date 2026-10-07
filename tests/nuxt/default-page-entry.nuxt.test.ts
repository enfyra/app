import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ allowed: true, selected: 7 as number | null, navigate: vi.fn() }));
mockNuxtImport('useGlobalState', () => () => ({ settings: ref({ defaultPage: state.selected }) }));
mockNuxtImport('useMenuRegistry', () => () => ({ menuItems: ref([{ id: '7', route: '/home', type: 'Menu', isEnabled: true }]) }));
mockNuxtImport('usePermissions', () => () => ({ hasMenuPermission: () => state.allowed }));
mockNuxtImport('useInitialLoading', () => () => ({ initialReady: ref(true) }));
mockNuxtImport('usePageHeaderRegistry', () => () => ({ registerPageHeader: vi.fn() }));
mockNuxtImport('navigateTo', () => state.navigate);
import EntryPage from '~/pages/index.vue';

describe('Default page entry', () => {
  it('replaces the root entry with the configured current path', async () => {
    state.allowed = true; state.selected = 7; state.navigate.mockClear();
    const wrapper = await mountSuspended(EntryPage, { route: '/' });
    expect(state.navigate).toHaveBeenCalledWith('/home', { replace: true });
    wrapper.unmount();
  });
  it('keeps the welcome surface for an inaccessible page', async () => {
    state.allowed = false; state.navigate.mockClear();
    const wrapper = await mountSuspended(EntryPage, { route: '/' });
    expect(state.navigate).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Default page unavailable');
    wrapper.unmount();
  });
});
