<script setup lang="ts">
const { current, dismiss } = useNotify()

const typeConfig = {
  success: { icon: 'lucide:check-circle-2', color: 'success' as const, bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-l-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  error: { icon: 'lucide:x-circle', color: 'error' as const, bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-l-red-500', text: 'text-red-600 dark:text-red-400' },
  warning: { icon: 'lucide:triangle-alert', color: 'warning' as const, bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-l-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  info: { icon: 'lucide:info', color: 'info' as const, bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-l-blue-500', text: 'text-blue-600 dark:text-blue-400' },
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
  <UModal
    v-if="current"
    :open="true"
    :close="false"
    :overlay="true"
    :ui="{
      overlay: 'bg-black/20 backdrop-blur-[2px]',
      content: 'surface-card max-w-xs rounded-xl overflow-hidden',
    }"
    @update:open="dismiss"
  >
    <template #body>
      <div class="border-l-4 p-5" :class="[cfg.border]">
        <div class="flex items-start gap-3">
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            :class="cfg.bg"
          >
            <UIcon :name="cfg.icon" :class="cfg.text" class="w-4 h-4" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold text-[var(--text-primary)]">{{ current?.title }}</div>
            <p
              v-if="current?.description"
              class="text-xs text-[var(--text-tertiary)] mt-1 break-words"
            >
              {{ current.description }}
            </p>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
