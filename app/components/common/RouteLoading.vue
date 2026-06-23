<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-40 flex items-center justify-center bg-[color-mix(in_srgb,var(--bg-app)_82%,transparent)] backdrop-blur-sm"
      >
        <div class="flex flex-col items-center gap-3">
          <svg class="h-8 w-8 animate-spin drop-shadow-[0_0_18px_color-mix(in_srgb,var(--brand-500)_22%,transparent)]" viewBox="0 0 24 24" aria-hidden="true">
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
  </Teleport>
</template>

<script setup lang="ts">
import type { RouteLoadingProps } from "~/types";

withDefaults(defineProps<RouteLoadingProps>(), {
  show: false,
  message: "Loading...",
});
</script>
