let activeLocks = 0;
let initialHtmlOverflow: string | undefined;

function lockDocumentScroll() {
  if (!import.meta.client) return;

  if (activeLocks === 0) {
    initialHtmlOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
  }

  activeLocks += 1;
}

function unlockDocumentScroll() {
  if (!import.meta.client || activeLocks === 0) return;

  activeLocks -= 1;

  if (activeLocks === 0) {
    document.documentElement.style.overflow = initialHtmlOverflow ?? '';
    initialHtmlOverflow = undefined;
  }
}

export function useOverlayScrollLock() {
  let locked = false;

  function lock() {
    if (locked) return;

    lockDocumentScroll();
    locked = true;
  }

  function unlock() {
    if (!locked) return;

    unlockDocumentScroll();
    locked = false;
  }

  onBeforeUnmount(unlock);

  return { lock, unlock };
}
