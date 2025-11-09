<template>
  <div class="relative w-full h-full">
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

    <div
      v-if="!isImageFile(file)"
      class="relative w-full h-full flex items-center justify-center overflow-hidden rounded-t-xl"
      :style="{
        background: fileTypeBackground,
      }"
    >
      <div
        class="relative z-10 transition-all duration-200"
        :class="hovered ? 'scale-105' : ''"
      >
        <UIcon
          :name="file.icon"
          class="w-12 h-12"
          :style="{
            color: fileTypeIconColor,
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))',
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

function isImageFile(file: FileItem): boolean {
  if (file?.mimetype) {
    return file.mimetype.startsWith("image/");
  }
  return false;
}

function getImageUrl(url: string): string {
  if (!url) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}quality=70`;
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = "none";
}

const fileTypeBackground = computed(() => {
  if (isImageFile(props.file)) {
    return 'linear-gradient(135deg, rgba(0, 102, 255, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)';
  }
  return 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(217, 70, 239, 0.1) 100%)';
});

const fileTypeIconColor = computed(() => {
  if (isImageFile(props.file)) {
    return '#94A3B8';
  }
  return '#94A3B8';
});
</script>