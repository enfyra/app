export function useMobileMenuAction() {
  const { register: registerHeaderActions } = useHeaderActionRegistry();
  const { toggleSidebar } = useGlobalState();

  registerHeaderActions([
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
