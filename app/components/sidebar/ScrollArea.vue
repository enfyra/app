<script setup lang="ts">
import { ScrollAreaRoot, ScrollAreaViewport, ScrollAreaScrollbar, ScrollAreaThumb } from 'reka-ui';

defineProps<{ collapsed?: boolean }>();
</script>

<template>
  <ScrollAreaRoot type="auto" class="sidebar-scroll-area min-h-0 w-full flex-1 overflow-hidden">
    <ScrollAreaViewport class="h-full w-full">
      <div :class="collapsed ? 'px-2' : 'px-3.5'">
        <slot />
      </div>
    </ScrollAreaViewport>
    <ScrollAreaScrollbar
      orientation="vertical"
      class="sidebar-scroll-track flex w-2 touch-none select-none bg-transparent p-px"
      :class="{ invisible: collapsed }"
    >
      <ScrollAreaThumb class="sidebar-scroll-thumb relative flex-1 rounded-full" />
    </ScrollAreaScrollbar>
  </ScrollAreaRoot>
</template>

<style scoped>
.sidebar-scroll-thumb {
  background: color-mix(in srgb, var(--md-primary) 18%, transparent);
}

@media (hover: hover) and (pointer: fine) {
  .sidebar-scroll-track:hover .sidebar-scroll-thumb {
    background: color-mix(in srgb, var(--md-primary) 30%, transparent);
  }
}
</style>
