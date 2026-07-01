
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

  const registerPageHeader = (config: PageHeaderConfig) => {
    const currentRoute = route.path;

    routeHeaders.value.set(currentRoute, { config, ownerUid });

    pageHeaderConfig.value = config;

    if (ownerUid !== undefined) {
      onUnmounted(() => {
        const registered = routeHeaders.value.get(currentRoute);
        if (registered?.ownerUid === ownerUid) {
          routeHeaders.value.delete(currentRoute);
          if (route.path === currentRoute) {
            pageHeaderConfig.value = null;
          }
        }
      });
    }
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
        pageHeaderConfig.value = routeHeader.config;
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
