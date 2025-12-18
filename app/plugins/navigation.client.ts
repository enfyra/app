import CommonBreadCrumbs from "~/components/common/BreadCrumbs.vue";

export default defineNuxtPlugin(() => {
  const route = useRoute();
  const router = useRouter();
  const { isMobile } = useScreen();

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
      variant: "soft",
      color: "secondary",
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
