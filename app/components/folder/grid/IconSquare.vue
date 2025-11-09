<template>
  <div
    class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
    :class="hovered ? 'scale-105' : ''"
    :style="{
      background: folderIconBgColor,
      boxShadow: iconShadow,
    }"
  >
    <UIcon
      :name="folderIconName"
      class="w-6 h-6 text-white"
      style="filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15))"
    />
  </div>
</template>

<script setup lang="ts">
import { getFolderIconName, getFolderIconColor } from "~/utils/file-management/folder-icons";

interface Props {
  folder: any;
  hovered?: boolean;
}

const props = defineProps<Props>();

const folderIconName = computed(() => {
  if (!props.folder) return "lucide:folder";
  return getFolderIconName(props.folder);
});

const folderIconBgColor = computed(() => {
  if (!props.folder) return "#7C3AED";
  
  if (props.folder.color) {
    return props.folder.color;
  }
  
  const colors = ["#3B82F6", "#7C3AED", "#F59E0B", "#14B8A6"];
  const folderId = props.folder.id || props.folder.name || "";
  
  let hash = 0;
  for (let i = 0; i < folderId.length; i++) {
    hash = folderId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  
  return colors[index];
});

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const iconShadow = computed(() => {
  if (props.hovered) {
    return `0 2px 8px ${hexToRgba(folderIconBgColor.value, 0.25)}`;
  }
  return 'none';
});
</script>

