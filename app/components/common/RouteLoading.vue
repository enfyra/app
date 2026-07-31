<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[color-mix(in_srgb,var(--shell-main-bg)_42%,transparent)] backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
    >
      <div
        class="absolute inset-x-0 top-0 h-0.5 overflow-hidden"
        aria-hidden="true"
      >
        <div class="route-loading-hairline h-full w-1/3 bg-[var(--brand-500)]" />
      </div>

      <div class="flex flex-col items-center gap-3">
        <svg
          class="h-8 w-8 animate-spin drop-shadow-[0_0_18px_color-mix(in_srgb,var(--brand-500)_22%,transparent)]"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="var(--brand-500)"
            stroke-width="2"
            fill="none"
            stroke-dasharray="60"
            stroke-dashoffset="40"
            stroke-linecap="round"
          />
        </svg>

        <p v-if="message" class="text-sm font-medium text-[var(--text-secondary)]">
          {{ message }}
        </p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { RouteLoadingProps } from "~/types";

withDefaults(defineProps<RouteLoadingProps>(), {
  show: false,
  message: "Loading...",
});
</script>

<style scoped>
.route-loading-hairline {
  animation: route-loading-slide 1.1s var(--ease-standard) infinite;
}

@keyframes route-loading-slide {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(360%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .route-loading-hairline {
    animation: none;
    transform: translateX(0);
    width: 100%;
  }
}
</style>
