import { computed, ref, shallowRef, toValue, watch } from 'vue'
import type { CursorPaginationOptions } from '~/types/table-pagination'

export function useCursorPagination<T, Cursor>(options: CursorPaginationOptions<T, Cursor>) {
  const page = ref(1)
  const data = shallowRef<T[]>([])
  const hasNextPage = ref(false)
  const loading = ref(false)
  const total = computed(() => options.total === undefined ? undefined : toValue(options.total))
  let cursors: (Cursor | null)[] = [null]
  let requestId = 0

  if (options.scope !== undefined) {
    watch(() => toValue(options.scope), () => {
      requestId += 1
      page.value = 1
      data.value = []
      cursors = [null]
      hasNextPage.value = false
      loading.value = false
    }, { flush: 'sync' })
  }

  async function fetchPage(targetPage: number, reset = false) {
    if (!Number.isInteger(targetPage) || targetPage < 1) return false
    if (!reset && (loading.value || targetPage > cursors.length)) return false
    const itemsPerPage = Math.max(1, Math.floor(toValue(options.itemsPerPage)))
    const cursor = reset ? null : cursors[targetPage - 1]!
    const run = ++requestId
    const scope = toValue(options.scope)
    loading.value = true
    try {
      const items = await options.fetchPage(cursor, itemsPerPage + 1)
      if (run !== requestId || scope !== toValue(options.scope) || items === null) return false
      const rows = items.slice(0, itemsPerPage)
      if (targetPage > page.value && rows.length === 0) {
        hasNextPage.value = false
        cursors = cursors.slice(0, page.value)
        return false
      }
      const nextCursors = reset ? [null] : cursors.slice(0, targetPage)
      const hasNext = items.length > itemsPerPage
      if (hasNext) nextCursors.push(options.getCursor(rows[rows.length - 1]!))
      cursors = nextCursors
      data.value = rows
      page.value = targetPage
      hasNextPage.value = hasNext
      return true
    } finally {
      if (run === requestId) loading.value = false
    }
  }

  return {
    page,
    data,
    total,
    hasNextPage,
    loading,
    setPage: (targetPage: number) => fetchPage(targetPage),
    reset: () => fetchPage(1, true),
  }
}
