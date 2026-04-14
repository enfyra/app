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

  function show(type: NotifyType, title: string, description?: string) {
    queue.value.push({ id: ++counter, type, title, description })
  }

  function success(title: string, description?: string) {
    show('success', title, description)
  }

  function error(title: string, description?: string) {
    show('error', title, description)
  }

  function warning(title: string, description?: string) {
    show('warning', title, description)
  }

  function info(title: string, description?: string) {
    show('info', title, description)
  }

  function dismiss() {
    queue.value.shift()
  }

  return { current, show, success, error, warning, info, dismiss }
}
