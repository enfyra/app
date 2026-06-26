<template>
  <div class="relative w-full h-full flex items-center justify-center overflow-hidden">
    
    <div
      class="absolute inset-0 opacity-20"
      style="
        background-image: radial-gradient(circle, color-mix(in srgb, var(--md-primary) 30%, transparent) 1px, transparent 1px);
        background-size: 16px 16px;
      "
    />

    <div
      class="absolute inset-0 opacity-30"
      style="background: radial-gradient(circle at center, color-mix(in srgb, var(--md-primary) 12%, transparent) 0%, transparent 70%)"
    />

    <div
      class="relative z-10 transition-all duration-300"
    >
      <UIcon
        :name="folder.icon"
        :size="96"
        style="color: var(--brand-700); filter: drop-shadow(0 4px 12px color-mix(in srgb, var(--md-primary) 30%, transparent))"
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