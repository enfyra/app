let listenerRegistered = false;

export function useScreen() {
  const width = useState("screen:width", () => typeof window !== "undefined" ? window.innerWidth : 0);
  const height = useState("screen:height", () => typeof window !== "undefined" ? window.innerHeight : 0);

  if (import.meta.client && !listenerRegistered) {
    listenerRegistered = true;
    window.addEventListener("resize", () => {
      width.value = window.innerWidth;
      height.value = window.innerHeight;
    });
  }

  const instance = getCurrentInstance();
  if (instance) {
    onMounted(() => {
      if (typeof window !== "undefined") {
        width.value = window.innerWidth;
        height.value = window.innerHeight;
      }
    });
  }

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

  return {
    width: computed(() => width.value),
    height: computed(() => height.value),
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    screenType,
  };
}
