export const useMobileKeyboard = (containerRef: Ref<HTMLElement | null>) => {
  const isKeyboardOpen = ref(false);
  let savedScrollTop = 0;
  let scrollCheckFrame: number | null = null;

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

  const lockBodyScroll = (viewportHeight?: number) => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    const body = document.body;
    const nuxt = document.getElementById('__nuxt');
    savedScrollTop = window.scrollY || html.scrollTop || body.scrollTop;
    const height = viewportHeight || window.visualViewport?.height || window.innerHeight;
    
    html.style.setProperty('overflow', 'hidden', 'important');
    html.style.setProperty('height', `${height}px`, 'important');
    html.style.setProperty('max-height', `${height}px`, 'important');
    html.style.setProperty('position', 'relative', 'important');
    
    body.style.setProperty('overflow', 'hidden', 'important');
    body.style.setProperty('position', 'fixed', 'important');
    body.style.setProperty('top', `-${savedScrollTop}px`, 'important');
    body.style.setProperty('width', '100%', 'important');
    body.style.setProperty('left', '0', 'important');
    body.style.setProperty('right', '0', 'important');
    body.style.setProperty('height', `${height}px`, 'important');
    body.style.setProperty('max-height', `${height}px`, 'important');
    
    if (nuxt) {
      nuxt.style.setProperty('height', `${height}px`, 'important');
      nuxt.style.setProperty('max-height', `${height}px`, 'important');
      nuxt.style.setProperty('overflow', 'hidden', 'important');
    }
    
    if (process.dev) {
      console.log('[Keyboard] Body and HTML locked, viewport height:', height, 'saved scroll:', savedScrollTop);
    }
  };

  const unlockBodyScroll = () => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    const body = document.body;
    const nuxt = document.getElementById('__nuxt');
    
    html.style.removeProperty('overflow');
    html.style.removeProperty('height');
    html.style.removeProperty('max-height');
    html.style.removeProperty('position');
    
    body.style.removeProperty('overflow');
    body.style.removeProperty('position');
    body.style.removeProperty('top');
    body.style.removeProperty('width');
    body.style.removeProperty('left');
    body.style.removeProperty('right');
    body.style.removeProperty('height');
    body.style.removeProperty('max-height');
    
    if (nuxt) {
      nuxt.style.removeProperty('height');
      nuxt.style.removeProperty('max-height');
      nuxt.style.removeProperty('overflow');
    }
    
    window.scrollTo(0, savedScrollTop);
  };

  const resetBodyScroll = () => {
    if (!isKeyboardOpen.value) return;
    const html = document.documentElement;
    const body = document.body;
    const nuxt = document.getElementById('__nuxt');
    const currentScroll = window.scrollY || html.scrollTop || body.scrollTop;
    
    const viewportHeightStr = getComputedStyle(html).getPropertyValue('--app-viewport-height');
    const viewportHeight = viewportHeightStr 
      ? parseFloat(viewportHeightStr.replace('px', ''))
      : (window.visualViewport?.height || window.innerHeight);
    
    if (currentScroll !== 0) {
      if (process.dev) {
        console.log('[Keyboard] Resetting scroll from:', currentScroll, {
          windowScrollY: window.scrollY,
          htmlScrollTop: html.scrollTop,
          bodyScrollTop: body.scrollTop,
          viewportHeight,
        });
      }
      window.scrollTo(0, 0);
      html.scrollTop = 0;
      body.scrollTop = 0;
    }
    
    html.style.setProperty('height', `${viewportHeight}px`, 'important');
    html.style.setProperty('max-height', `${viewportHeight}px`, 'important');
    body.style.setProperty('height', `${viewportHeight}px`, 'important');
    body.style.setProperty('max-height', `${viewportHeight}px`, 'important');
    
    if (nuxt) {
      nuxt.style.setProperty('height', `${viewportHeight}px`, 'important');
      nuxt.style.setProperty('max-height', `${viewportHeight}px`, 'important');
    }
  };

  const startScrollMonitoring = () => {
    if (scrollCheckFrame) return;
    const checkScroll = () => {
      if (isKeyboardOpen.value) {
        resetBodyScroll();
        scrollCheckFrame = requestAnimationFrame(checkScroll);
      } else {
        scrollCheckFrame = null;
      }
    };
    scrollCheckFrame = requestAnimationFrame(checkScroll);
  };

  const stopScrollMonitoring = () => {
    if (scrollCheckFrame) {
      cancelAnimationFrame(scrollCheckFrame);
      scrollCheckFrame = null;
    }
  };

  const applyViewportStyles = (viewportHeight: number, keyboardActive: boolean) => {
    setViewportVariable(viewportHeight);
    if (!containerRef.value) return;
    if (keyboardActive) {
      containerRef.value.style.height = `${viewportHeight}px`;
      containerRef.value.style.transition = 'height 0.3s ease-out';
      containerRef.value.style.overflow = 'hidden';
      lockBodyScroll(viewportHeight);
      startScrollMonitoring();
    } else {
      containerRef.value.style.height = '';
      containerRef.value.style.overflow = '';
      containerRef.value.style.transition = '';
      stopScrollMonitoring();
      unlockBodyScroll();
    }
  };

  const syncViewportHeight = () => {
    if (typeof window === 'undefined') return;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const windowHeight = window.innerHeight;
    const heightDiff = windowHeight - viewportHeight;
    const keyboardActive = heightDiff > 150;
    isKeyboardOpen.value = keyboardActive;
    if (process.dev) {
      console.log('[Keyboard]', { keyboardActive, viewportHeight, windowHeight, heightDiff });
    }
    applyViewportStyles(viewportHeight, keyboardActive);
  };

  onMounted(() => {
    syncViewportHeight();
    if (typeof window === 'undefined') return;
    const handleViewportResize = () => syncViewportHeight();
    const handleScroll = () => {
      if (isKeyboardOpen.value) {
        resetBodyScroll();
      }
    };
    window.addEventListener('resize', handleViewportResize);
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
      window.visualViewport.addEventListener('scroll', handleViewportResize);
    }

    if (process.dev) {
      (window as any).__testKeyboard = {
        open: () => {
          const viewportHeight = window.innerHeight * 0.6;
          isKeyboardOpen.value = true;
          applyViewportStyles(viewportHeight, true);
          console.log('[Test] Keyboard opened, viewport height:', viewportHeight);
        },
        close: () => {
          isKeyboardOpen.value = false;
          applyViewportStyles(window.innerHeight, false);
          console.log('[Test] Keyboard closed');
        },
        toggle: () => {
          if (isKeyboardOpen.value) {
            (window as any).__testKeyboard.close();
          } else {
            (window as any).__testKeyboard.open();
          }
        },
        status: () => {
          const html = document.documentElement;
          const body = document.body;
          const viewportHeightStr = getComputedStyle(html).getPropertyValue('--app-viewport-height');
          const viewportHeight = viewportHeightStr 
            ? parseFloat(viewportHeightStr.replace('px', ''))
            : (window.visualViewport?.height || window.innerHeight);
          
          console.log('[Test] Keyboard status:', {
            isOpen: isKeyboardOpen.value,
            viewportHeight,
            windowHeight: window.innerHeight,
            htmlHeight: html.style.height || getComputedStyle(html).height,
            htmlMaxHeight: html.style.maxHeight || getComputedStyle(html).maxHeight,
            bodyPosition: body.style.position || getComputedStyle(body).position,
            bodyHeight: body.style.height || getComputedStyle(body).height,
            bodyMaxHeight: body.style.maxHeight || getComputedStyle(body).maxHeight,
            bodyScrollTop: body.scrollTop,
            htmlScrollTop: html.scrollTop,
            windowScrollY: window.scrollY,
            bodyOverflow: body.style.overflow || getComputedStyle(body).overflow,
            htmlOverflow: html.style.overflow || getComputedStyle(html).overflow,
          });
        },
      };
      console.log('[Test] Keyboard test helpers available. Use: window.__testKeyboard.open() / close() / toggle() / status()');
    }
    onBeforeUnmount(() => {
      stopScrollMonitoring();
      unlockBodyScroll();
      window.removeEventListener('resize', handleViewportResize);
      window.removeEventListener('scroll', handleScroll, { capture: true });
      document.removeEventListener('scroll', handleScroll, { capture: true });
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

