import { CommonBreadCrumbs } from "#components";

export function useNavigationActions() {
  const { register: registerHeaderActions } = useHeaderActionRegistry();

  registerHeaderActions([
    {
      id: "navigation-breadcrumbs",
      component: CommonBreadCrumbs,
      side: "left",
      global: true,
      permission: {
        allowAll: true,
      },
      order: 1,
    },
  ]);
}
