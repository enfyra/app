/*
 * Safety gap, in px, between the fold and the point where the main bar counts as
 * back on screen. The main bar always re-enters from below, so growing the root
 * downward by this much retires the mini bar while the main bar is still just
 * below the fold. The two are therefore never on screen at the same time, and the
 * mini bar's own height is irrelevant to the handoff.
 */
const HANDOFF_GAP_PX = 12;

/**
 * Reports whether a main bar has left the viewport, so a fixed mini bar can stand
 * in for it. The main bar stays a normal in-flow element; this only observes it.
 */
export function useMiniBarVisibility(target: Ref<HTMLElement | null>) {
  const isMiniVisible = ref(false);

  if (import.meta.client && typeof IntersectionObserver !== "undefined") {
    watchPostEffect((onCleanup) => {
      const el = target.value;
      if (!el) return;

      const observer = new IntersectionObserver(
        ([record]) => {
          if (record) isMiniVisible.value = !record.isIntersecting;
        },
        { rootMargin: `0px 0px ${HANDOFF_GAP_PX}px 0px`, threshold: 0 },
      );
      observer.observe(el);

      onCleanup(() => observer.disconnect());
    });
  }

  return { isMiniVisible };
}
