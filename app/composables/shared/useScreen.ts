import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  readonly,
  nextTick,
  getCurrentInstance,
} from "vue";

export function useScreen() {
  const width = ref(0);
  const height = ref(0);

  const updateDimensions = () => {
    if (typeof window !== "undefined") {
      width.value = window.innerWidth;
      height.value = window.innerHeight;
    }
  };

  const isMobile = computed(() => width.value < 768);
  const isTablet = computed(() => width.value >= 768 && width.value < 1024);
  const isDesktop = computed(() => width.value >= 1024);
  const isLargeDesktop = computed(() => width.value >= 1440);

  const screenType = computed(() => {
    if (isMobile.value) return "mobile";
    if (isTablet.value) return "tablet";
    if (isLargeDesktop.value) return "large-desktop";
    return "desktop";
  });

  const instance = getCurrentInstance();
  if (instance) {
    onMounted(async () => {
      await nextTick();
      if (typeof window !== "undefined") {
        updateDimensions();
        window.addEventListener("resize", updateDimensions);
      }
    });

    onUnmounted(() => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", updateDimensions);
      }
    });
  }

  return {
    width: readonly(width),
    height: readonly(height),
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    screenType,
  };
}
