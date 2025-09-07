<template>
  <Teleport to="body">
    <div
      v-if="isMobile"
      class="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 z-[10000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-warning-title"
    >
      <!-- Animated background pattern -->
      <div class="absolute inset-0 opacity-10">
        <div
          class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent"
        ></div>
      </div>

      <div
        class="relative bg-gradient-to-b from-gray-800/95 to-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-[0_20px_70px_rgba(0,0,0,0.8)] max-w-md w-full p-8 text-center space-y-6 transform transition-transform duration-300"
      >
        <!-- Glowing top accent -->
        <div
          class="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        ></div>

        <!-- Icon with animation -->
        <div class="flex justify-center">
          <div class="relative">
            <div
              class="absolute inset-0 bg-destructive/20 rounded-xl blur-2xl animate-pulse"
            ></div>
            <div
              class="relative w-20 h-20 bg-gradient-to-br from-destructive/10 to-destructive/5 rounded-xl border border-destructive/20 flex items-center justify-center"
            >
              <UIcon
                name="lucide:monitor-x"
                class="w-12 h-12 text-destructive animate-pulse"
              />
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="space-y-3">
          <h2
            id="mobile-warning-title"
            class="text-2xl font-bold bg-gradient-to-r from-destructive to-destructive/70 bg-clip-text text-transparent"
          >
            Desktop Only
          </h2>
          <p class="text-gray-400 leading-relaxed">
            This application requires a larger screen for optimal functionality.
            Please access it from a tablet or desktop device.
          </p>
        </div>

        <!-- Stats with better styling -->
        <div
          class="bg-black/30 rounded-xl p-4 space-y-3 border border-gray-800"
        >
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">Minimum Width</span>
            <span class="font-mono text-primary font-semibold">768px</span>
          </div>
          <div
            class="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"
          ></div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">Your Screen</span>
            <span class="font-mono text-destructive font-semibold"
              >{{ width }}px</span
            >
          </div>
        </div>

        <!-- Bottom decoration -->
        <div class="flex justify-center gap-1 pt-2">
          <div class="w-1 h-1 bg-gray-600 rounded-full animate-pulse"></div>
          <div
            class="w-1 h-1 bg-gray-600 rounded-full animate-pulse delay-100"
          ></div>
          <div
            class="w-1 h-1 bg-gray-600 rounded-full animate-pulse delay-200"
          ></div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { isMobile, width } = useScreen();
</script>
