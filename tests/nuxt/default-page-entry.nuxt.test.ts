import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MenuItem } from '~/types/menu';

const state = vi.hoisted(() => ({ allowed: true, selected: 7 as number | null, navigate: vi.fn(), menus: [] as MenuItem[] }));
mockNuxtImport('useGlobalState', () => () => ({ settings: ref({ defaultPage: state.selected, projectName: 'Example project' }) }));
mockNuxtImport('useMenuRegistry', () => () => ({ menuItems: ref(state.menus) }));
mockNuxtImport('usePermissions', () => () => ({ hasMenuPermission: () => state.allowed }));
mockNuxtImport('useInitialLoading', () => () => ({ initialReady: ref(true) }));
mockNuxtImport('usePageHeaderRegistry', () => () => ({ registerPageHeader: vi.fn() }));
mockNuxtImport('navigateTo', () => state.navigate);
import EntryPage from '~/pages/index.vue';

describe('Default page entry', () => {
  beforeEach(() => {
    state.allowed = true;
    state.selected = 7;
    state.navigate.mockClear();
    state.menus = [{ id: '7', label: 'Dashboard', route: '/home', type: 'Menu', isEnabled: true }];
  });
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
    expect(wrapper.findAll('a')).toHaveLength(0);
    wrapper.unmount();
  });

  it('renders a compact welcome panel and permitted navigation without assigning a default page', async () => {
    state.selected = null;
    state.menus.push(
      { id: 'data', label: 'Data', route: '/data', type: 'Dropdown Menu', isEnabled: true, description: 'Browse your collections' },
      { id: 'general', label: 'General', route: '/settings/general', type: 'Menu', isEnabled: true, parent: state.menus[0] },
      { id: 'disabled', label: 'Disabled', route: '/disabled', isEnabled: false },
      { id: 'param', label: 'Detail', route: '/notes/:id', isEnabled: true },
      { id: 'external', label: 'External', route: '//example.com', isEnabled: true },
    );
    const wrapper = await mountSuspended(EntryPage, { route: '/' });
    try {
      expect(state.navigate).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain('Welcome to your workspace');
      expect(wrapper.text()).toContain('Example project');
      expect(wrapper.findAll('a').map(link => link.attributes('href'))).toEqual(['/home', '/data', '/settings/general']);
      expect(wrapper.find('#workspace-pages-title').exists()).toBe(true);
      expect(wrapper.text()).not.toContain('Default page unavailable');
    } finally { wrapper.unmount(); }
  });

  it('keeps welcome useful without visible menus or a settings shortcut', async () => {
    state.selected = null; state.allowed = false;
    const wrapper = await mountSuspended(EntryPage, { route: '/' });
    try {
      expect(wrapper.text()).toContain('use the sidebar');
      expect(wrapper.findAll('a')).toHaveLength(0);
      expect(wrapper.find('#workspace-pages-title').exists()).toBe(false);
      expect(wrapper.text()).not.toContain('Choose your starting page');
      expect(state.navigate).not.toHaveBeenCalled();
    } finally { wrapper.unmount(); }
  });
});
