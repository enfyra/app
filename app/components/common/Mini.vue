<template>
  <div
    class="w-full aspect-square bg-gray-700 text-white flex items-center justify-center font-bold text-lg"
  >
    {{ props.name }}
  </div>
</template>
<script setup lang="ts">
const props = withDefaults(defineProps<{ name?: string }>(), { name: "D" });
</script>
