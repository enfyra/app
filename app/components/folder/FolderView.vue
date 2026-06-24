<script setup lang="ts">
interface Props {
  folders: any[];
  viewMode?: "grid" | "list";
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  isSelectionMode?: boolean;
  selectedItems?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  emptyTitle: "No folders",
  emptyDescription: "No folders in this location",
  isSelectionMode: false,
  selectedItems: () => [],
});

const emit = defineEmits<{
  "folder-click": [folder: any];
  "toggle-selection": [folderId: string];
  "refresh-folders": [];
}>();

function handleFolderClick(folder: any) {
  emit("folder-click", folder);
}

function toggleItemSelection(folderId: string) {
  emit("toggle-selection", folderId);
}
</script>

<template>
  <div>
    <Transition name="loading-fade" mode="out-in">
      <div
        v-if="loading && folders.length === 0"
        class="col-span-full"
      >
        <CommonLoadingState type="folder" />
      </div>

      <div v-else-if="!loading && folders.length > 0" key="content">
        <FolderGrid
          :folders="folders"
          :empty-title="emptyTitle"
          :empty-description="emptyDescription"
          :is-selection-mode="isSelectionMode"
          :selected-items="selectedItems"
          @folder-click="handleFolderClick"
          @toggle-selection="toggleItemSelection"
          @refresh-folders="() => emit('refresh-folders')"
        />
      </div>

      <div
        v-else-if="!loading && folders.length === 0"
        key="empty"
        class="text-center py-12"
      >
        <UIcon
          :name="getDefaultFolderIcon()"
          class="w-16 h-16 eapp-text-quaternary mx-auto mb-4"
        />
        <p class="text-lg font-medium eapp-text-tertiary">
          {{ emptyTitle }}
        </p>
        <p class="text-sm eapp-text-quaternary mt-1">{{ emptyDescription }}</p>
      </div>
    </Transition>
  </div>
</template>
