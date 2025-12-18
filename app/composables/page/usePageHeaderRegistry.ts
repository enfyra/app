
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
}

export const usePageHeaderRegistry = () => {
  const route = useRoute();

  const pageHeaderConfig = useState<PageHeaderConfig | null>("page-header", () => null);

  const routeHeaders = useState<Map<string, PageHeaderConfig>>(
    "route-page-headers",
    () => new Map()
  );

  const registerPageHeader = (config: PageHeaderConfig) => {
    const currentRoute = route.path;

    routeHeaders.value.set(currentRoute, config);

    pageHeaderConfig.value = config;
  };

  const clearPageHeader = () => {
    pageHeaderConfig.value = null;
  };

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
