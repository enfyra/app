<template>
    <UIcon
      :name="folderIconName"
    :class="[getSoftIconColor()]"
    size="48"
    />
</template>

<script setup lang="ts">
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
  const colorClasses = [
    'text-brand-600 dark:text-brand-400',
    'text-primary-600 dark:text-primary-400',
    'text-warning-600 dark:text-warning-400',
    'text-info-600 dark:text-info-400',
  ];
  return colorClasses[getColorIndex.value] || colorClasses[0];
};
</script>

