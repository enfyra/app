export const useMobileKeyboard = (containerRef: Ref<HTMLElement | null>) => {
  const isKeyboardOpen = ref(false);

  const updateViewportHeight = (heightDiff: number) => {
    if (containerRef.value) {
      if (heightDiff > 0) {
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        containerRef.value.style.height = `${viewportHeight}px`;
        containerRef.value.style.transition = 'height 0.3s ease-out';
        containerRef.value.style.overflow = 'hidden';
      } else {
        containerRef.value.style.height = '';
        containerRef.value.style.overflow = '';
      }
    }
  };

  onMounted(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      const handleViewportResize = () => {
        if (!window.visualViewport) return;

        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const heightDiff = windowHeight - viewportHeight;

        isKeyboardOpen.value = heightDiff > 150;
        updateViewportHeight(heightDiff);
      };

      window.visualViewport.addEventListener('resize', handleViewportResize);
      window.visualViewport.addEventListener('scroll', handleViewportResize);

      onBeforeUnmount(() => {
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleViewportResize);
          window.visualViewport.removeEventListener('scroll', handleViewportResize);
        }
      });
    }
  });

  return {
    isKeyboardOpen,
  };
};

