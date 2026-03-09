import CommonBreadCrumbs from "~/components/common/BreadCrumbs.vue";

export default defineNuxtPlugin(() => {
  const route = useRoute();
  const router = useRouter();
  const { isMobile, width } = useScreen();
  const { sidebarCollapsed, setSidebarCollapsed } = useGlobalState();

  const isTabletOrMobile = computed(() => width.value <= 1024);

  const breadcrumbSegments = computed(() => {
    const parts = route.path.split("/").filter(Boolean);

    return parts.map((part, i) => {
      const label = decodeURIComponent(part);
      const to = "/" + parts.slice(0, i + 1).join("/");
      return { label, to };
    });
  });

  const canGoBack = computed(() => breadcrumbSegments.value.length > 1);

  const goBack = () => {
    router.back();
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed.value);
  };

  useHeaderActionRegistry([
    {
      id: "sidebar-toggle-button",
      icon: "lucide:panel-left",
      variant: "outline",
      color: "neutral",
      size: isMobile ? 'lg' : 'md',
      side: "left",
      class: 'cursor-pointer !aspect-square',
      onClick: toggleSidebar,
      global: true,
      permission: {
        allowAll: true,
      },
      order: 0,
      get show() {
        return !isTabletOrMobile.value && sidebarCollapsed.value;
      },
    },
    {
      id: "navigation-back-button",
      icon: "lucide:arrow-left",
      variant: "outline",
      color: "neutral",
      size: isMobile ? 'lg' : 'md',
      side: "left",
      class: 'cursor-pointer !aspect-square',
      get disabled() {
        return !canGoBack.value;
      },
      onClick: goBack,
      global: true,
      permission: {
        allowAll: true,
      },
      order: 1
    },
    {
      id: "navigation-breadcrumbs",
      component: CommonBreadCrumbs,
      side: "left",
      get props() {
        return {
          segments: breadcrumbSegments.value,
        };
      },
      get key() {
        return `breadcrumbs-${route.path}`;
      },
      global: true,
      permission: {
        allowAll: true,
      },
      order: 2
    },
  ]);
});
