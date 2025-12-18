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
        class="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-40"
      >
        <div class="flex flex-col items-center gap-3">
          
          <div
            class="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"
          ></div>

          <p v-if="message" class="text-sm text-muted-foreground">
            {{ message }}
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">

import type { RouteLoadingProps } from "../utils/types";

withDefaults(defineProps<RouteLoadingProps>(), {
  show: false,
  message: "Loading...",
});
</script>
