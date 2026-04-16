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

  async function waitForCleanBody() {
    if (typeof document === 'undefined') return
    for (let i = 0; i < 40; i++) {
      const body = document.body
      const style = body.style
      const hasOpenDrawer = document.querySelector('[data-vaul-drawer-direction]')
      const hasOpenDialog = document.querySelector('[role="dialog"][data-state="open"]')
      if (
        style.pointerEvents !== 'none' &&
        style.overflow !== 'hidden' &&
        !hasOpenDrawer &&
        !hasOpenDialog
      ) return
      await new Promise((r) => setTimeout(r, 25))
    }
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
