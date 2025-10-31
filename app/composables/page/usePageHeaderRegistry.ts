/**
 * Stat card for page header
 */
export interface PageHeaderStat {
  label: string;
  value: string | number;
}

/**
 * Page Header Configuration
 */
export interface PageHeaderConfig {
  title: string;
  description?: string;
  stats?: PageHeaderStat[];
  variant?: "default" | "minimal" | "stats-focus";
  gradient?: "purple" | "blue" | "cyan" | "none";
}

/**
 * Composable for managing page header with auto-cleanup on route change
 */
export const usePageHeaderRegistry = () => {
  const route = useRoute();

  const pageHeaderConfig = useState<PageHeaderConfig | null>("page-header", () => null);

  const routeHeaders = useState<Map<string, PageHeaderConfig>>(
    "route-page-headers",
    () => new Map()
  );

  /**
   * Register page header configuration for current route
   */
  const registerPageHeader = (config: PageHeaderConfig) => {
    const currentRoute = route.path;

    routeHeaders.value.set(currentRoute, config);

    pageHeaderConfig.value = config;
  };

  /**
   * Clear page header
   */
  const clearPageHeader = () => {
    pageHeaderConfig.value = null;
  };

  /**
   * Check if page header is registered
   */
  const hasPageHeader = computed(() => pageHeaderConfig.value !== null);

  watch(
    () => route.path,
    (newPath, oldPath) => {
      pageHeaderConfig.value = null;

      const routeHeader = routeHeaders.value.get(newPath);
      if (routeHeader) {
        pageHeaderConfig.value = routeHeader;
      }
    },
    { immediate: true }
  );

  return {
    pageHeader: readonly(pageHeaderConfig),
    hasPageHeader,

    registerPageHeader,
    clearPageHeader,
  };
};
