export default defineNuxtPlugin(() => {
  const { toggleSidebar } = useGlobalState();
  const { width } = useScreen();

  useHeaderActionRegistry([
    {
      id: "mobile-menu-toggle",
      icon: "lucide:menu",
      variant: "solid",
      size: "lg",
      side: "left",
      color: "secondary",
      class: " flex-shrink-0",
      onClick: toggleSidebar,
      global: true,
      get show() {
        return width.value <= 1024;
      },
      permission: {
        allowAll: true,
      },
      order: 0,
    },
  ]);
});
