
import type { EffectScope } from "vue";

let pageHeaderRouteWatcherScope: EffectScope | null = null;

export interface PageHeaderStat {
  label: string;
  value: string | number;
}

export interface PageHeaderConfig {
  title: string;
  description?: string;
  stats?: PageHeaderStat[];
  variant?: "default" | "minimal" | "stats-focus";
  gradient?: "purple" | "blue" | "cyan" | "none";
  leadingIcon?: string;
  hideLeadingIcon?: boolean;
}

export const usePageHeaderRegistry = () => {
  const route = useRoute();
  const ownerUid = getCurrentInstance()?.uid;

  const pageHeaderConfig = useState<PageHeaderConfig | null>("page-header", () => null);

  const routeHeaders = useState<Map<string, { config: PageHeaderConfig; ownerUid?: number }>>(
    "route-page-headers",
    () => new Map()
  );

  if (ownerUid !== undefined) {
    onUnmounted(() => {
      const nextHeaders = new Map(routeHeaders.value);
      let shouldClearCurrentHeader = false;

      for (const [path, registered] of routeHeaders.value) {
        if (registered.ownerUid !== ownerUid) continue;
        nextHeaders.delete(path);
        if (pageHeaderConfig.value === registered.config) {
          shouldClearCurrentHeader = true;
        }
      }

      routeHeaders.value = nextHeaders;
      if (shouldClearCurrentHeader) {
        pageHeaderConfig.value = null;
      }
    });
  }

  const registerPageHeader = (config: PageHeaderConfig) => {
    const currentRoute = route.path;

    routeHeaders.value = new Map(routeHeaders.value).set(currentRoute, {
      config,
      ownerUid,
    });

    if (route.path === currentRoute) {
      pageHeaderConfig.value = config;
    }
  };

  const clearPageHeader = () => {
    pageHeaderConfig.value = null;
  };

  const hasPageHeader = computed(() => pageHeaderConfig.value !== null);

  if (import.meta.client && !pageHeaderRouteWatcherScope) {
    pageHeaderRouteWatcherScope = effectScope(true);
    pageHeaderRouteWatcherScope.run(() => {
      watch(
        () => route.path,
        (newPath) => {
          pageHeaderConfig.value = routeHeaders.value.get(newPath)?.config ?? null;
        },
        { immediate: true, flush: "sync" }
      );
    });
  }

  return {
    pageHeader: readonly(pageHeaderConfig),
    hasPageHeader,

    registerPageHeader,
    clearPageHeader,
  };
};
