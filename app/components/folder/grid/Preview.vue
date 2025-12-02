<template>
  <div class="relative w-full h-full flex items-center justify-center overflow-hidden">
    <!-- Dotted grid pattern background -->
    <div
      class="absolute inset-0 opacity-20"
      style="
        background-image: radial-gradient(circle, rgba(124, 58, 237, 0.3) 1px, transparent 1px);
        background-size: 16px 16px;
      "
    />

    <!-- Gradient backdrop for depth -->
    <div
      class="absolute inset-0 opacity-30"
      style="background: radial-gradient(circle at center, #7C3AED20 0%, transparent 70%)"
    />

    <!-- Large centered icon -->
    <div
      class="relative z-10 transition-all duration-300"
    >
      <UIcon
        :name="folder.icon"
        :size="96"
        style="color: #7C3AED; filter: drop-shadow(0 4px 12px rgba(124, 58, 237, 0.3))"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  folder: any;
  hovered?: boolean;
}

const props = defineProps<Props>();
</script>