import { CommonBreadcrumbs } from "#components";

export function useNavigationActions() {
  const route = useRoute();
  const router = useRouter();
  const { isMobile, isTablet } = useScreen();

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

  useHeaderActionRegistry([
    {
      id: "navigation-back-button",
      icon: "lucide:arrow-left",
      variant: "ghost",
      color: "neutral",
      size: "lg",
      side: "left",
      class: 'cursor-pointer',
      get disabled() {
        return !canGoBack.value;
      },
      get show() {
        return isMobile.value || isTablet.value;
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
      component: CommonBreadcrumbs,
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
}
