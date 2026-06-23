<script setup lang="ts">
const { current, dismiss } = useNotify();

const typeConfig = {
  success: {
    icon: 'lucide:check-circle',
    tone: 'success',
    iconClass: 'text-[var(--badge-success-soft-text)]',
    tileClass: 'bg-[var(--badge-success-soft-bg)] ring-[var(--badge-success-soft-border)]',
  },
  error: {
    icon: 'lucide:x-circle',
    tone: 'error',
    iconClass: 'text-[var(--badge-danger-soft-text)]',
    tileClass: 'bg-[var(--badge-danger-soft-bg)] ring-[var(--badge-danger-soft-border)]',
  },
  warning: {
    icon: 'lucide:alert-triangle',
    tone: 'warning',
    iconClass: 'text-[var(--badge-warning-soft-text)]',
    tileClass: 'bg-[var(--badge-warning-soft-bg)] ring-[var(--badge-warning-soft-border)]',
  },
  info: {
    icon: 'lucide:info',
    tone: 'info',
    iconClass: 'text-[var(--badge-info-soft-text)]',
    tileClass: 'bg-[var(--badge-info-soft-bg)] ring-[var(--badge-info-soft-border)]',
  },
} as const;

const cfg = computed(() => {
  const type = current.value?.type ?? 'info';
  return typeConfig[type as keyof typeof typeConfig] ?? typeConfig.info;
});

const open = ref(false);
const isPaused = ref(false);
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

const toastDuration = computed(() => {
  const type = current.value?.type ?? 'info';
  return type === 'error' || type === 'warning' ? 6000 : 3600;
});

function clearDismissTimer() {
  if (!dismissTimer) return;
  clearTimeout(dismissTimer);
  dismissTimer = null;
}

function startDismissTimer() {
  clearDismissTimer();
  isPaused.value = false;
  dismissTimer = setTimeout(() => handleClose(), toastDuration.value);
}

function pauseDismissTimer() {
  isPaused.value = true;
  clearDismissTimer();
}

watch(current, async (v) => {
  clearDismissTimer();
  if (v) {
    await nextTick();
    open.value = true;
    startDismissTimer();
  } else {
    open.value = false;
  }
});

function handleClose() {
  if (!open.value) return;
  clearDismissTimer();
  open.value = false;
  setTimeout(() => dismiss(), 160);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    e.preventDefault();
    handleClose();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  clearDismissTimer();
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="notify-toast">
      <div
        v-if="current && open"
        class="fixed bottom-4 left-4 z-[220] w-[min(420px,calc(100vw-2rem))]"
        role="status"
        aria-live="polite"
        @mouseenter="pauseDismissTimer"
        @mouseleave="startDismissTimer"
      >
        <div
          class="surface-card relative flex items-start gap-3 overflow-hidden p-3 shadow-[var(--shadow-md)] ring-1 ring-[var(--card-border)]"
          :style="{ '--notify-duration': `${toastDuration}ms` }"
        >
          <div
            :class="[
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] ring-1 ring-inset',
              cfg.tileClass
            ]"
          >
            <UIcon :name="cfg.icon" :class="['h-5 w-5', cfg.iconClass]" />
          </div>

          <div class="min-w-0 flex-1 py-0.5">
            <p class="truncate text-sm font-bold text-[var(--text-primary)]">
              {{ current.title }}
            </p>
            <p
              v-if="current.description"
              class="mt-1 text-sm leading-5 text-[var(--text-tertiary)]"
            >
              {{ current.description }}
            </p>
          </div>

          <UButton
            icon="lucide:x"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Dismiss notification"
            class="-mr-1 -mt-1 shrink-0"
            @click="handleClose"
          />

          <div class="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-[var(--surface-muted)]">
            <div
              :key="current.id"
              :class="[
                'notify-progress h-full origin-left',
                isPaused ? 'is-paused' : '',
                cfg.tone === 'success' ? 'bg-[var(--badge-success-soft-text)]' : '',
                cfg.tone === 'error' ? 'bg-[var(--badge-danger-soft-text)]' : '',
                cfg.tone === 'warning' ? 'bg-[var(--badge-warning-soft-text)]' : '',
                cfg.tone === 'info' ? 'bg-[var(--badge-info-soft-text)]' : ''
              ]"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.notify-toast-enter-active,
.notify-toast-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.notify-toast-enter-from,
.notify-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.notify-progress {
  animation: notify-progress var(--notify-duration) linear forwards;
}

.notify-progress.is-paused {
  animation-play-state: paused;
}

@keyframes notify-progress {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}
</style>
