export function useMobileMenuAction() {
  const { toggleSidebar } = useGlobalState();

  useHeaderActionRegistry([
    {
      id: "sidebar-toggle",
      icon: "lucide:panel-left",
      variant: "ghost",
      color: "neutral",
      size: "md",
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
