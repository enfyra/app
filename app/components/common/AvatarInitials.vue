<template>
  <div
    class="w-full aspect-square bg-[var(--action-neutral-bg-active)] text-[var(--action-neutral-text-hover)] flex items-center justify-center font-bold text-lg"
  >
    {{ props.name }}
  </div>
</template>
<script setup lang="ts">
const props = withDefaults(defineProps<{ name?: string }>(), { name: "D" });
</script>
