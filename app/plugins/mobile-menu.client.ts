export default defineNuxtPlugin(() => {
  const { toggleSidebar } = useGlobalState();
  const { isMobile, isTablet } = useScreen();

  useHeaderActionRegistry([
    {
      id: "mobile-menu-toggle",
      icon: "lucide:menu",
      variant: "solid",
      size: "lg",
      side: "left",
      color: "secondary",
      class: "lg:hidden flex-shrink-0",
      onClick: toggleSidebar,
      global: true,
      get show() {
        return isMobile.value || isTablet.value;
      },
      permission: {
        allowAll: true,
      },
      order: 0,
    },
  ]);
});
