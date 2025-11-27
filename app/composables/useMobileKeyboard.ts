export const useMobileKeyboard = (containerRef: Ref<HTMLElement | null>) => {
  const isKeyboardOpen = ref(false);

  const setViewportVariable = (height: number) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--app-viewport-height', `${height}px`);
    }
  };

  const resetViewportVariable = () => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.removeProperty('--app-viewport-height');
    }
  };

  const applyViewportStyles = (viewportHeight: number, keyboardActive: boolean) => {
    setViewportVariable(viewportHeight);
    if (!containerRef.value) return;
    if (keyboardActive) {
      containerRef.value.style.height = `${viewportHeight}px`;
      containerRef.value.style.transition = 'height 0.3s ease-out';
      containerRef.value.style.overflow = 'hidden';
    } else {
      containerRef.value.style.height = '';
      containerRef.value.style.overflow = '';
      containerRef.value.style.transition = '';
    }
  };

  const syncViewportHeight = () => {
    if (typeof window === 'undefined') return;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const windowHeight = window.innerHeight;
    const heightDiff = windowHeight - viewportHeight;
    const keyboardActive = heightDiff > 150;
    isKeyboardOpen.value = keyboardActive;
    applyViewportStyles(viewportHeight, keyboardActive);
  };

  onMounted(() => {
    syncViewportHeight();
    if (typeof window === 'undefined') return;
    const handleViewportResize = () => syncViewportHeight();
    window.addEventListener('resize', handleViewportResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
      window.visualViewport.addEventListener('scroll', handleViewportResize);
    }
    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleViewportResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
        window.visualViewport.removeEventListener('scroll', handleViewportResize);
      }
      if (containerRef.value) {
        containerRef.value.style.height = '';
        containerRef.value.style.overflow = '';
        containerRef.value.style.transition = '';
      }
      resetViewportVariable();
    });
  });

  return {
    isKeyboardOpen,
  };
};

