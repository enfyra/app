<template>
  <div class="relative w-full h-full">
    <!-- Image preview -->
    <div
      v-if="isImageFile(file)"
      class="absolute inset-0 w-full h-full"
    >
      <CommonImage
        :src="getImageUrl(file.assetUrl)"
        class="w-full h-full object-cover"
        @error="handleImageError"
      />
      <div class="absolute inset-0 bg-black/20" />
    </div>

    <!-- For files and folders - show icon with dotted grid pattern -->
    <div
      v-if="!isImageFile(file)"
      class="relative w-full h-full flex items-center justify-center overflow-hidden"
    >
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
        :style="{
          background: `radial-gradient(circle at center, ${getIconColor()}20 0%, transparent 70%)`
        }"
      />

      <!-- Large centered icon -->
      <div
        class="relative z-10 transition-all duration-300"
        :class="hovered ? 'scale-110 rotate-3' : ''"
      >
        <UIcon
          :name="file.icon"
          :size="96"
          :style="{
            color: getIconColor(),
            filter: 'drop-shadow(0 4px 12px rgba(124, 58, 237, 0.3))'
          }"
        />
      </div>
    </div>
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

// Add quality parameter to image URL for faster loading
function getImageUrl(url: string): string {
  if (!url) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}quality=70`;
}

// Handle image loading errors
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = "none";
}

// Get icon color based on file type
function getIconColor(): string {
  // Check if it's a folder
  if (props.file.mimetype?.startsWith("folder/") || props.file.icon?.includes("folder")) {
    return "#7C3AED"; // Purple for folders
  }
  // Default color for files
  return "#0066FF"; // Blue for files
}
</script>