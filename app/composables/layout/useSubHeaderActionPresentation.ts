import type { HeaderAction } from '~/types/ui';

export function useSubHeaderActionPresentation() {
  const { subHeaderActions } = useSubHeaderActionRegistry();
  const { checkPermissionCondition } = usePermissions();
  const { isDesktop } = useScreen();

  const visibleActions = computed(() => subHeaderActions.value.filter(action =>
    (action.show === undefined || unref(action.show)) &&
    (!action.permission || checkPermissionCondition(action.permission)),
  ));
  const menuActions = computed(() => visibleActions.value.filter(action =>
    action.mobileDisplay === 'menu' || (!action.component && action.mobileDisplay !== 'inline'),
  ));
  const inlineActions = computed(() => isDesktop.value
    ? visibleActions.value
    : visibleActions.value.filter(action => !menuActions.value.includes(action)));
  const leftActions = computed(() => inlineActions.value.filter(action => action.side === 'left'));
  const rightActions = computed(() => inlineActions.value.filter(action => action.side !== 'left'));
  const hasConditionalActions = computed(() => isDesktop.value &&
    subHeaderActions.value.some(action => action.show !== undefined));

  function runAction(action: HeaderAction) {
    if (!visibleActions.value.includes(action) || unref(action.disabled) || unref(action.loading)) return;
    if (action.onClick) return action.onClick();
    if (action.submit) return action.submit();
    const to = unref(action.to);
    if (to) return navigateTo(to, { replace: unref(action.replace) });
  }

  return { isDesktop, visibleActions, menuActions, inlineActions, leftActions, rightActions, hasConditionalActions, runAction };
}
