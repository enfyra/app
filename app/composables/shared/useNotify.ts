type NotifyType = 'success' | 'error' | 'warning' | 'info'

const notifyConfig = {
  success: {
    icon: 'lucide:check-circle',
    color: 'success',
    duration: 3600,
  },
  error: {
    icon: 'lucide:x-circle',
    color: 'error',
    duration: 6000,
  },
  warning: {
    icon: 'lucide:alert-triangle',
    color: 'warning',
    duration: 6000,
  },
  info: {
    icon: 'lucide:info',
    color: 'info',
    duration: 3600,
  },
} as const

export function useNotify() {
  const toast = useToast()

  function hasOpenOverlay() {
    if (document.querySelector('[data-vaul-overlay]')) return true
    if (document.querySelector('[role="dialog"][data-state="open"]')) return true
    if (document.body.style.overflow === 'hidden') return true
    return false
  }

  function waitForCleanBody(): Promise<void> {
    if (typeof document === 'undefined') return Promise.resolve()
    if (!hasOpenOverlay()) return Promise.resolve()

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
        if (!hasOpenOverlay()) finish()
      })

      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-state', 'style'],
        childList: true,
        subtree: true,
      })

      const timeout = setTimeout(() => finish(), 500)
    })
  }

  async function show(type: NotifyType, title: string, description?: string) {
    await nextTick()
    await waitForCleanBody()
    const config = notifyConfig[type]
    toast.add({
      title,
      description,
      icon: config.icon,
      color: config.color,
      duration: config.duration,
      progress: {
        color: config.color,
      },
    })
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
    toast.toasts.value[0]?.id && toast.remove(toast.toasts.value[0].id)
  }

  return {
    current: computed(() => toast.toasts.value[0] ?? null),
    toasts: toast.toasts,
    show,
    success,
    error,
    warning,
    info,
    dismiss,
    clear: toast.clear,
  }
}
