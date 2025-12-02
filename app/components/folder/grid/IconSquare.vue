<template>
  <UIcon
    :name="folderIconName"
    :class="[getSoftIconColor()]"
    size="48"
  />
</template>

<script setup lang="ts">
import { getFolderIconName, getFolderIconColor } from "~/utils/file-management/folder-icons";

interface Props {
  folder: any;
}

const props = defineProps<Props>();

const folderIconName = computed(() => {
  if (!props.folder) return "lucide:folder";
  return getFolderIconName(props.folder);
});

const getColorIndex = computed(() => {
  if (!props.folder) return 0;
  
  const folderId = props.folder.id || props.folder.name || "";
  let hash = 0;
  for (let i = 0; i < folderId.length; i++) {
    hash = folderId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 4;
});

const getSoftIconColor = () => {
  const colors = ['brand', 'primary', 'warning', 'info'];
  const color = colors[getColorIndex.value];
  return `text-${color}-600 dark:text-${color}-400`;
};
</script>

