<template>
  <div
    class="relative h-32 p-6 flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"
  >
    <div class="absolute inset-0 opacity-10">
      <svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <pattern
          id="grid"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="10" cy="10" r="1" fill="currentColor" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>

    <div class="flex justify-center items-center p-4">
      <UIcon
        :name="folder.icon"
        :size="96"
        class="transition-all duration-300"
        :class="[
          folder.iconColor,
          hovered ? 'scale-110 rotate-3' : '',
        ]"
      />
    </div>

    <div
      class="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  folder: any;
  hovered?: boolean;
}

const props = defineProps<Props>();
</script>