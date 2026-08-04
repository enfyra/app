const scrollPositions = new Map<string, number>();
const MAX_SAVED_POSITIONS = 50;
const savedKeys: string[] = [];

function savePosition(key: string, top: number) {
  if (!scrollPositions.has(key)) savedKeys.push(key);
  scrollPositions.set(key, top);
  if (savedKeys.length > MAX_SAVED_POSITIONS) {
    const oldest = savedKeys.shift();
    if (oldest) scrollPositions.delete(oldest);
  }
}

export function useWorkspaceScroll() {
  const route = useRoute();
  const router = useRouter();

  let currentPath = route.path;
  let isPopNavigation = false;
  let removeBeforeEach: (() => void) | null = null;

  const onPopState = () => {
    isPopNavigation = true;
  };

  onMounted(() => {
    removeBeforeEach = router.beforeEach((to) => {
      savePosition(currentPath, window.scrollY);
      currentPath = to.path;
      return true;
    });

    window.addEventListener("popstate", onPopState);
  });

  onUnmounted(() => {
    window.removeEventListener("popstate", onPopState);
    removeBeforeEach?.();
  });

  watch(
    () => route.path,
    (newPath) => {
      nextTick(() => {
        let top = 0;
        if (isPopNavigation) {
          top = scrollPositions.get(newPath) ?? 0;
          isPopNavigation = false;
        }
        window.scrollTo({ top, left: 0, behavior: "auto" });
      });
    },
  );

  return {
    savePosition,
  };
}
