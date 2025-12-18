<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999]"
      >
        <Transition
          enter-active-class="transition-all duration-300 delay-100"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-200"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div v-if="show" class="relative">
            
            <div class="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 rounded-2xl blur-xl animate-pulse"></div>

            <div class="relative bg-background/95 backdrop-blur border border-border/50 rounded-2xl p-8 shadow-2xl min-w-[320px]">
              <div class="flex flex-col items-center gap-5">
                
                <div class="relative w-16 h-16">
                  
                  <div class="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                  
                  <div class="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
                  
                  <div class="absolute inset-[18px] bg-primary rounded-full animate-pulse"></div>
                </div>

                <div class="text-center space-y-2">
                  <h3 class="text-lg font-semibold text-foreground">{{ title }}</h3>
                  <p class="text-sm text-muted-foreground max-w-[250px]">{{ description }}</p>
                </div>

                <div class="flex gap-1.5">
                  <div class="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div class="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div class="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">

import type { GlobalLoadingProps } from "../../utils/types";

withDefaults(defineProps<GlobalLoadingProps>(), {
  title: 'Processing...',
  description: 'Please wait while we process your request'
});
</script>