type NotifyType = 'success' | 'error' | 'warning' | 'info'

interface NotifyItem {
  id: number
  type: NotifyType
  title: string
  description?: string
}

let counter = 0
const queue = ref<NotifyItem[]>([])

export function useNotify() {
  const current = computed(() => queue.value[0] ?? null)

  function isBodyClean() {
    const body = document.body
    const style = body.style
    if (style.pointerEvents === 'none' || style.overflow === 'hidden') return false
    if (document.querySelector('[data-vaul-drawer-direction]')) return false
    if (document.querySelector('[role="dialog"][data-state="open"]')) return false
    return true
  }

  function waitForCleanBody(): Promise<void> {
    if (typeof document === 'undefined') return Promise.resolve()
    if (isBodyClean()) return Promise.resolve()

    return new Promise((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        observer.disconnect()
        clearTimeout(timeout)
        resolve()
      }

      const observer = new MutationObserver(() => {
        if (isBodyClean()) finish()
      })

      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['style', 'data-state', 'data-vaul-drawer-direction'],
        childList: true,
        subtree: true,
      })

      const timeout = setTimeout(finish, 1000)
    })
  }

  async function show(type: NotifyType, title: string, description?: string) {
    await nextTick()
    await waitForCleanBody()
    queue.value.push({ id: ++counter, type, title, description })
  }

  function success(title: string, description?: string) {
    return show('success', title, description)
  }

  function error(title: string, description?: string) {
    return show('error', title, description)
  }

  function warning(title: string, description?: string) {
    return show('warning', title, description)
  }

  function info(title: string, description?: string) {
    return show('info', title, description)
  }

  function dismiss() {
    queue.value.shift()
  }

  return { current, show, success, error, warning, info, dismiss }
}
