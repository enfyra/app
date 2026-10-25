export function useUnsavedChangesGuard(
  hasUnsavedChanges: () => boolean,
  options?: {
    title?: string;
    content?: string;
  },
) {
  const { confirm } = useConfirm();
  const router = useRouter();
  const route = useRoute();
  const guardedPath = route.path;
  let bypassNextLeave = false;

  function allowNextNavigation() {
    bypassNextLeave = true;
  }

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (bypassNextLeave || !hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  const removeRouterGuard = router.beforeEach(async (to, from) => {
    if (to.path === from.path || from.path !== guardedPath) return true;
    if (bypassNextLeave) {
      bypassNextLeave = false;
      return true;
    }
    if (!hasUnsavedChanges()) return true;
    return await confirm({
      title: options?.title ?? 'Discard changes?',
      content:
        options?.content ??
        'You have unsaved changes. Are you sure you want to leave this page? All changes will be lost.',
      confirmText: 'Discard',
      cancelText: 'Keep editing',
    });
  });

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
  });

  onBeforeUnmount(() => {
    removeRouterGuard();
    window.removeEventListener('beforeunload', handleBeforeUnload);
  });

  return {
    allowNextNavigation,
  };
}
