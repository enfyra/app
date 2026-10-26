import type { ExtensionConnection, ExtensionLoadingController, ExtensionWarmContext, ExtensionWarmTask } from '~/types/extension-loading';
import type { FeatureCollection, FeatureExtensionRuntime, FeatureRuntimeMenu } from '~/types/feature-api';
import type { MenuItem } from '~/types/menu';
import { createExtensionLoadScheduler } from '~/utils/extension-load-scheduler';
import { EXTENSION_RUNTIME_FIELDS, prefixFields } from '~/utils/extension-fields';
import { getExtensionCacheGeneration } from './cache';

const controllers = new WeakMap<object, ExtensionLoadingController>();
const INTENT_DELAY_MS = 120;
const SETTLE_DELAY_MS = 600;

function scheduleIdle(callback: () => void): () => void {
  let idle: number | undefined;
  let cancelled = false;
  const waitForIdle = (deadline: IdleDeadline) => {
    if (cancelled) return;
    if (deadline.timeRemaining() > 5) callback();
    else idle = window.requestIdleCallback(waitForIdle);
  };
  const timer = setTimeout(() => {
    if (cancelled) return;
    if (typeof window.requestIdleCallback === 'function') {
      idle = window.requestIdleCallback(waitForIdle);
    } else callback();
  }, SETTLE_DELAY_MS);
  return () => {
    cancelled = true;
    clearTimeout(timer);
    if (idle !== undefined) window.cancelIdleCallback(idle);
  };
}

export function useExtensionPrefetch(): ExtensionLoadingController {
  const nuxtApp = useNuxtApp();
  const existing = controllers.get(nuxtApp);
  if (existing) return existing;
  const { menuItems, findBestMenuMatch } = useMenuRegistry();
  const { hasMenuPermission } = usePermissions();
  const { getIdFieldName } = useDatabase();
  const { getCachedExtensionMeta, setCachedExtensionMeta, loadDynamicComponent, isComponentCached } = useDynamicComponent();
  const router = useRouter();
  const scheduler = createExtensionLoadScheduler({ schedule: scheduleIdle });
  const requests = new Map<string, { generation: number; promise: Promise<FeatureExtensionRuntime | null>; controller: AbortController }>();
  let intentTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  const eligible = (candidate: MenuItem) => {
    const menu = menuItems.value.find(item => item.id === candidate.id);
    if (!menu) return false;
    const path = menu.route || menu.path;
    if (!menu.isEnabled || menu.component || !hasMenuPermission(menu) || !path || !path.startsWith('/') || path.startsWith('//')) return false;
    try { return router.resolve(path).matched.some(record => record.name === 'sidebar-path'); }
    catch { return false; }
  };
  const loadMenuExtension = async (menuId: string, refresh = false): Promise<FeatureExtensionRuntime | null> => {
    if (disposed) throw new DOMException('Extension loader disposed', 'AbortError');
    const key = `menu:${menuId}`;
    const generation = getExtensionCacheGeneration();
    const pending = requests.get(key);
    if (pending?.generation === generation) return pending.promise;
    const cached = getCachedExtensionMeta(key) as FeatureExtensionRuntime | undefined;
    if (cached && !refresh) return cached;
    const controller = new AbortController();
    const promise = (async () => {
      const response = await nuxtApp.runWithContext(() => useAuthFetch<FeatureCollection<FeatureRuntimeMenu>>('/api/enfyra_menu', {
        signal: controller.signal,
        retry: 0,
        timeout: 15000,
        query: {
          fields: ['*', prefixFields('extension', EXTENSION_RUNTIME_FIELDS)].join(','),
          filter: { _and: [{ [getIdFieldName()]: { _eq: menuId } }, { isEnabled: { _eq: true } }] },
        },
      }));
      if (controller.signal.aborted || generation !== getExtensionCacheGeneration() || disposed) {
        throw new DOMException('Extension metadata changed during loading', 'AbortError');
      }
      const extension = response.data?.[0]?.extension ?? null;
      if (extension && !Array.isArray(extension)) setCachedExtensionMeta(key, extension);
      return extension && !Array.isArray(extension) ? extension : null;
    })();
    requests.set(key, { generation, promise, controller });
    try { return await promise; }
    finally { if (requests.get(key)?.promise === promise) requests.delete(key); }
  };

  const taskForMenu = (menu: MenuItem): ExtensionWarmTask => ({
    key: `menu:${menu.id}`,
    async run(context: ExtensionWarmContext): Promise<void> {
      const check = () => {
        if (context.signal.aborted || !eligible(menu)) throw new DOMException('Extension warmup cancelled', 'AbortError');
      };
      check();
      const extension = await loadMenuExtension(menu.id);
      await context.checkpoint();
      check();
      if (!extension?.isEnabled || extension.type !== 'page' || !extension.compiledCode || !extension.extensionId) return;
      if (isComponentCached(extension.extensionId, extension.updatedAt)) return;
      await loadDynamicComponent(extension.compiledCode, extension.extensionId, extension.updatedAt, false, undefined, {
        checkpoint: async () => { await context.checkpoint(); check(); },
        speculative: () => !context.isForeground(),
      });
    },
  });
  const refreshCandidates = () => {
    const current = findBestMenuMatch(router.currentRoute.value.path)?.item;
    const candidates = menuItems.value.filter(menu => eligible(menu) && menu.id !== current?.id);
    candidates.sort((a, b) => {
      const group = (menu: MenuItem) => Boolean(current && String(menu.parent ?? '') === String(current.parent ?? ''));
      return Number(group(b)) - Number(group(a)) || (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id);
    });
    scheduler.setCandidates(candidates.map(taskForMenu));
  };
  const cancelPrefetchIntent = () => { clearTimeout(intentTimer); intentTimer = undefined; };
  const prefetchForPath = async (path?: string) => {
    if (!import.meta.client || !path) return;
    const menu = findBestMenuMatch(path)?.item;
    if (menu && eligible(menu)) await scheduler.prefetch(taskForMenu(menu));
  };
  const controller: ExtensionLoadingController = {
    loadMenuExtension,
    beginForeground(key) {
      const end = scheduler.beginForeground(key);
      return () => { end(); if (!disposed) refreshCandidates(); };
    },
    setReady: ready => scheduler.setReady(ready),
    setEnabled: enabled => scheduler.setEnabled(enabled),
    refreshCandidates,
    prefetchForPath,
    schedulePrefetchIntent(path) {
      cancelPrefetchIntent();
      if (path) intentTimer = setTimeout(() => { intentTimer = undefined; void prefetchForPath(path); }, INTENT_DELAY_MS);
    },
    cancelPrefetchIntent,
    invalidate() {
      cancelPrefetchIntent();
      for (const request of requests.values()) request.controller.abort();
      requests.clear();
      scheduler.invalidate();
      refreshCandidates();
    },
    dispose() {
      disposed = true;
      cancelPrefetchIntent();
      for (const request of requests.values()) request.controller.abort();
      requests.clear();
      scheduler.dispose();
      controllers.delete(nuxtApp);
    },
  };
  controllers.set(nuxtApp, controller);
  return controller;
}

export function useExtensionWarmup() {
  const nuxtApp = useNuxtApp();
  const loader = useExtensionPrefetch();
  const router = useRouter();
  const { initialReady } = useInitialLoading();
  const { routeLoading } = useGlobalState();
  const { activeRequests } = useAppActivity();
  const { routesLoading } = useRoutes();
  const { menuDefinitionsPending } = useMenuApi();
  const { globalExtensionsPending } = useGlobalExtensions();
  const { menuItems, findBestMenuMatch } = useMenuRegistry();
  const { me } = useAuth();
  const { extensionCacheInvalidation } = useDynamicComponent();
  const mounted = ref(false);
  const pagePending = ref(false);
  let releaseNavigation: (() => void) | undefined;
  let stopNavigation: (() => void) | undefined;
  let stopAfterNavigation: (() => void) | undefined;
  let stopNavigationError: (() => void) | undefined;
  const connection = import.meta.client ? (navigator as Navigator & { connection?: ExtensionConnection }).connection : undefined;
  const environmentAllowed = ref(false);
  const updateEnvironment = () => {
    environmentAllowed.value = document.visibilityState === 'visible' && navigator.onLine !== false && !connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType ?? '');
  };
  watch(() => mounted.value && initialReady.value && !pagePending.value && !routeLoading.value && !routesLoading.value && !menuDefinitionsPending.value && !globalExtensionsPending.value && activeRequests.value === 0, ready => loader.setReady(ready), { immediate: true, flush: 'sync' });
  watch(() => environmentAllowed.value && Boolean(me.value), enabled => loader.setEnabled(enabled), { immediate: true, flush: 'sync' });
  watch([menuItems, () => router.currentRoute.value.path, () => me.value?.roles, () => me.value?.isRootAdmin], () => loader.refreshCandidates(), { deep: true });
  watch(() => extensionCacheInvalidation.value, () => loader.invalidate(), { flush: 'sync' });
  const removeStart = nuxtApp.hook('page:start', () => { pagePending.value = true; });
  const removeFinish = nuxtApp.hook('page:finish', () => { pagePending.value = false; });
  onMounted(() => {
    mounted.value = true;
    updateEnvironment();
    loader.refreshCandidates();
    document.addEventListener('visibilitychange', updateEnvironment);
    window.addEventListener('online', updateEnvironment);
    window.addEventListener('offline', updateEnvironment);
    connection?.addEventListener('change', updateEnvironment);
    stopNavigation = router.beforeEach(to => {
      releaseNavigation?.();
      const match = findBestMenuMatch(to.path)?.item;
      releaseNavigation = loader.beginForeground(match ? `menu:${match.id}` : 'navigation');
    });
    const endNavigation = () => { releaseNavigation?.(); releaseNavigation = undefined; };
    stopAfterNavigation = router.afterEach(endNavigation);
    stopNavigationError = router.onError(endNavigation);
  });
  onBeforeUnmount(() => {
    releaseNavigation?.();
    stopNavigation?.();
    stopAfterNavigation?.();
    stopNavigationError?.();
    removeStart();
    removeFinish();
    document.removeEventListener('visibilitychange', updateEnvironment);
    window.removeEventListener('online', updateEnvironment);
    window.removeEventListener('offline', updateEnvironment);
    connection?.removeEventListener('change', updateEnvironment);
    loader.dispose();
  });
}
