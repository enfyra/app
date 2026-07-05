export function useMobileMenuAction() {
  const { register: registerHeaderActions } = useHeaderActionRegistry();
  const { sidebarVisible, toggleSidebar } = useGlobalState();
  const sidebarToggleIcon = computed(() =>
    sidebarVisible.value ? "lucide:panel-left-close" : "lucide:panel-left-open"
  );

  registerHeaderActions([
    {
      id: "sidebar-toggle",
      icon: sidebarToggleIcon,
      variant: "ghost",
      color: "neutral",
      size: "md",
      class: "sidebar-toggle-action",
      side: "left",
      onClick: toggleSidebar,
      global: true,
      permission: {
        allowAll: true,
      },
      order: 0,
    },
  ]);
}
