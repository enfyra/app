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

  // Global state (shared across all instances)
  const pageHeaderConfig = useState<PageHeaderConfig | null>("page-header", () => null);

  // Route-specific headers storage
  const routeHeaders = useState<Map<string, PageHeaderConfig>>(
    "route-page-headers",
    () => new Map()
  );

  /**
   * Register page header configuration for current route
   */
  const registerPageHeader = (config: PageHeaderConfig) => {
    const currentRoute = route.path;

    // Store in route-specific map
    routeHeaders.value.set(currentRoute, config);

    // Set as current header
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

  // Auto-clear and restore on route change
  watch(
    () => route.path,
    (newPath, oldPath) => {
      // Clear current header
      pageHeaderConfig.value = null;

      // Restore header for new route if it exists
      const routeHeader = routeHeaders.value.get(newPath);
      if (routeHeader) {
        pageHeaderConfig.value = routeHeader;
      }
    },
    { immediate: true }
  );

  return {
    // State
    pageHeader: readonly(pageHeaderConfig),
    hasPageHeader,

    // Actions
    registerPageHeader,
    clearPageHeader,
  };
};
