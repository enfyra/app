<script setup lang="ts">
const { current, dismiss } = useNotify()

const typeConfig = {
  success: { icon: 'lucide:check-circle', color: 'success' as const, ring: 'ring-green-200 dark:ring-green-800/40', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
  error: { icon: 'lucide:x-circle', color: 'error' as const, ring: 'ring-red-200 dark:ring-red-800/40', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
  warning: { icon: 'lucide:alert-triangle', color: 'warning' as const, ring: 'ring-amber-200 dark:ring-amber-800/40', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
  info: { icon: 'lucide:info', color: 'info' as const, ring: 'ring-blue-200 dark:ring-blue-800/40', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
}

const cfg = computed(() => {
  const type = current.value?.type ?? 'info'
  return typeConfig[type as keyof typeof typeConfig] ?? typeConfig.info
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && current.value) {
    e.preventDefault()
    dismiss()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="notify">
      <div
        v-if="current"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click.self />

        <div
          class="relative surface-card rounded-2xl shadow-xl ring-1 p-6 w-full max-w-sm space-y-4"
          :class="cfg.ring"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              :class="cfg.bg"
            >
              <UIcon :name="cfg.icon" :class="cfg.text" class="w-5 h-5" />
            </div>
            <span class="text-lg font-semibold text-[var(--text-primary)]">{{ current.title }}</span>
          </div>

          <p
            v-if="current.description"
            class="text-sm text-[var(--text-secondary)] break-words pl-[52px]"
          >
            {{ current.description }}
          </p>

          <div class="flex justify-end pt-1">
            <UButton :color="cfg.color" @click="dismiss">
              Got it
            </UButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.notify-enter-active { transition: all 200ms ease-out; }
.notify-leave-active { transition: all 150ms ease-in; }
.notify-enter-from,
.notify-leave-to {
  opacity: 0;
}
.notify-enter-from .surface-card,
.notify-leave-to .surface-card {
  transform: scale(0.95);
}
</style>
