<template>
  <div
    class="relative h-32 p-6 flex items-center justify-center overflow-hidden"
    :class="[
      !isImageFile(file)
        ? 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20'
        : '',
    ]"
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

    <div
      v-if="isImageFile(file)"
      class="absolute inset-0 w-full h-full"
    >
      <CommonImage
        :src="file.assetUrl"
        class="w-full h-full object-cover"
        @error="handleImageError"
      />
      <div class="absolute inset-0 bg-black/20" />
    </div>

    <div
      v-if="!isImageFile(file)"
      class="flex justify-center items-center p-4 relative z-10"
    >
      <UIcon
        :name="file.icon"
        :size="96"
        class="transition-all duration-300"
        :class="[
          file.iconColor,
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
import type { FileItem } from "~/utils/types";

interface Props {
  file: FileItem & {
    displayName: string;
    icon: string;
    iconColor: string;
    assetUrl: string;
  };
  hovered?: boolean;
}

const props = defineProps<Props>();

// Check if file is an image using mimetype for accuracy
function isImageFile(file: FileItem): boolean {
  if (file?.mimetype) {
    return file.mimetype.startsWith("image/");
  }
  return false;
}

// Handle image loading errors
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = "none";
}
</script>