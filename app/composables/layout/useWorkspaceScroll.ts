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

  let workspaceEl: HTMLElement | null = null;
  let currentPath = route.path;
  let isPopNavigation = false;

  onMounted(() => {
    workspaceEl = document.querySelector(".app-workspace");

    router.beforeEach((to) => {
      if (workspaceEl && workspaceEl.scrollTop > 0) {
        savePosition(currentPath, workspaceEl.scrollTop);
      }
      currentPath = to.path;
      return true;
    });

    const onPopState = () => {
      isPopNavigation = true;
    };
    window.addEventListener("popstate", onPopState);

    const cleanup = () => {
      window.removeEventListener("popstate", onPopState);
    };

    onUnmounted(cleanup);
  });

  watch(
    () => route.path,
    (newPath) => {
      nextTick(() => {
        const el = document.querySelector(".app-workspace");
        if (!el) return;

        if (isPopNavigation) {
          const saved = scrollPositions.get(newPath);
          el.scrollTop = saved ?? 0;
          isPopNavigation = false;
        } else {
          el.scrollTop = 0;
        }
      });
    },
  );

  return {
    savePosition,
  };
}
