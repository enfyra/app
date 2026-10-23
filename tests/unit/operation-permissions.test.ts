import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { ref } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_ME_FIELDS } from '~/utils/common/constants';

const state = { me: ref<any>(null) };
mockNuxtImport('useAuth', () => () => ({ me: state.me }));
mockNuxtImport('useDatabase', () => () => ({ getId: (record: any) => record?._id ?? record?.id }));
import { usePermissions } from '~/composables/shared/usePermissions';

const grant = (method: string, extra: Record<string, unknown> = {}) => ({
  isEnabled: true, role: { id: 'editor' }, route: { id: 1, path: '/orders' },
  routeMethodConfigs: [{ available: true, method: { name: method } }], ...extra,
});

beforeEach(() => { state.me.value = { id: 'reader', roles: [], allowedRoutePermissions: [] }; });

describe('operation-owned UI grants', () => {
  it('requests canonical operations, availability and route state instead of removed methods', () => {
    expect(DEFAULT_ME_FIELDS).not.toContain('roles.routePermissions.methods.name');
    expect(DEFAULT_ME_FIELDS).toContain('roles.routePermissions.routeMethodConfigs.method.name');
    expect(DEFAULT_ME_FIELDS).toContain('allowedRoutePermissions.routeMethodConfigs.available');
    expect(DEFAULT_ME_FIELDS).toContain('allowedRoutePermissions.route.isEnabled');
  });
  it('grants an available canonical role operation', () => {
    state.me.value.roles = [{ id: 'editor', routePermissions: [grant('PATCH')] }];
    expect(usePermissions().hasPermission('/orders', 'patch')).toBe(true);
  });
  it('unions direct and role grants rather than letting a different direct method shadow roles', () => {
    state.me.value.allowedRoutePermissions = [grant('GET', { allowedUsers: [{ id: 'reader' }] })];
    state.me.value.roles = [{ id: 'editor', routePermissions: [grant('PATCH')] }];
    expect(usePermissions().hasPermission('/orders', 'PATCH')).toBe(true);
  });
  it('does not combine another permission scope with the requested method', () => {
    state.me.value.roles = [{ id: 'editor', routePermissions: [
      grant('GET'), grant('PATCH', { role: { id: 'other' }, allowedUsers: [{ id: 'other' }] }),
    ] }];
    expect(usePermissions().hasPermission('/orders', 'PATCH')).toBe(false);
  });
  it('allows a role grant even when its allowedUsers names another user, matching ESV union scope', () => {
    state.me.value.roles = [{ id: 'editor', routePermissions: [grant('PATCH', { role: { id: 'editor' }, allowedUsers: [{ id: 'other' }] })] }];
    expect(usePermissions().hasPermission('/orders', 'PATCH')).toBe(true);
  });
  it.each([
    { isEnabled: false },
    { route: { path: '/orders', isEnabled: false } },
    { routeMethodConfigs: [{ available: false, method: { name: 'PATCH' } }] },
    { routeMethodConfigs: [] },
    { methods: [{ name: 'PATCH' }], routeMethodConfigs: undefined },
    { role: null, allowedUsers: [] },
  ])('fails closed for disabled or missing operations: %j', extra => {
    state.me.value.roles = [{ id: 'editor', routePermissions: [grant('PATCH', extra)] }];
    expect(usePermissions().hasPermission('/orders', 'PATCH')).toBe(false);
  });
  it('supports Mongo direct-user identities and case-insensitive route literals', () => {
    state.me.value = { _id: 'reader', allowedRoutePermissions: [grant('PATCH', { allowedUsers: [{ _id: 'reader' }] })] };
    expect(usePermissions().hasPermission('/ORDERS', 'PATCH')).toBe(true);
  });
});
