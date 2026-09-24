const SHOW_DELAY_MS = 160;
const MIN_VISIBLE_MS = 320;

/**
 * Turns a raw in-flight flag into a calm one for refresh chrome.
 *
 * A fast request previously toggled the refresh styling on and off within a frame
 * or two, which the eye reads as a flicker. The indicator now waits out a short
 * delay before appearing, so quick refreshes show no chrome at all, and once it is
 * visible it stays for a minimum span so it cannot strobe.
 */
export function useDeferredBusy(isBusy: () => boolean, options: { delayMs?: number; minVisibleMs?: number } = {}) {
  const delayMs = options.delayMs ?? SHOW_DELAY_MS;
  const minVisibleMs = options.minVisibleMs ?? MIN_VISIBLE_MS;

  const active = ref(false);

  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  let shownAt = 0;

  function clearTimers() {
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = undefined;
    }
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = undefined;
    }
  }

  function show() {
    active.value = true;
    shownAt = Date.now();
  }

  function hide(schedule = true) {
    if (!schedule || Date.now() - shownAt >= minVisibleMs) {
      active.value = false;
      return;
    }

    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      hideTimer = undefined;
      active.value = false;
    }, minVisibleMs - (Date.now() - shownAt));
  }

  watch(
    isBusy,
    (busy) => {
      if (busy) {
        if (hideTimer) {
          // Re-entering while the minimum span is still running: keep it visible
          // instead of hiding and showing again.
          clearTimeout(hideTimer);
          hideTimer = undefined;
          return;
        }
        if (active.value || showTimer) return;
        showTimer = setTimeout(() => {
          showTimer = undefined;
          show();
        }, delayMs);
        return;
      }

      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = undefined;
      }
      if (active.value) hide();
    },
    { immediate: true },
  );

  onUnmounted(clearTimers);

  return { active: computed(() => active.value) };
}
