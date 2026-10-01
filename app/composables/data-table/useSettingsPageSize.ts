const PAGE_SIZES = [10, 20, 50, 100] as const

export function useSettingsPageSize(key: string, fallback = 10) {
  const size = ref<number>(fallback)
  const storageKey = `settings-page-size:${key}`

  if (import.meta.client) {
    try {
      const saved = Number(localStorage.getItem(storageKey))
      if (PAGE_SIZES.includes(saved as typeof PAGE_SIZES[number])) size.value = saved
    } catch {}
  }

  watch(size, value => {
    if (!import.meta.client || !PAGE_SIZES.includes(value as typeof PAGE_SIZES[number])) return
    try { localStorage.setItem(storageKey, String(value)) } catch {}
  })

  return size
}
