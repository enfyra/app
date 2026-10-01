import type { Ref } from 'vue';

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

export function useWorkspaceScroll(workspace: Ref<HTMLElement | null>) {
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
      savePosition(currentPath, workspace.value?.scrollTop ?? 0);
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
        workspace.value?.scrollTo({ top, left: 0, behavior: "auto" });
      });
    },
  );

  return {
    savePosition,
  };
}
