<template>
  <div class="space-y-4">
    <!-- Grid View -->
    <div
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      <!-- Folder Items Container -->
      <div v-if="transformedFolders.length > 0" class="contents">
        <FolderGridCard
          v-for="folder in transformedFolders"
          :key="folder.id"
          :folder="folder"
          :is-selection-mode="isSelectionMode"
          :selected-items="selectedItems"
          :move-mode="moveState.moveMode"
          :is-folder-disabled="isFolderDisabled(folder.id)"
          @folder-click="$emit('folder-click', $event)"
          @toggle-selection="$emit('toggle-selection', $event)"
          @refresh-folders="$emit('refresh-folders')"
          @delete-folder="deleteFolder"
        />
      </div>

      <!-- Empty State -->
      <div v-else class="col-span-full text-center py-12">
        <UIcon
          :name="getDefaultFolderIcon()"
          class="w-16 h-16 text-muted-foreground mx-auto mb-4"
        />
        <p class="text-lg font-medium text-muted-foreground">
          {{ emptyTitle }}
        </p>
        <p class="text-sm text-muted-foreground mt-1">
          {{ emptyDescription }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDate } from "~/utils/common/filter/filter-helpers";
import {
  getFolderIcon,
  getDefaultFolderIcon,
} from "~/utils/file-management/folder-icons";
import { formatFileSize } from "~/utils/file-management/file-utils";

interface Props {
  folders: any[];
  emptyTitle?: string;
  emptyDescription?: string;
  isSelectionMode?: boolean;
  selectedItems?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  emptyTitle: "No folders",
  emptyDescription: "No folders in this location",
  isSelectionMode: false,
  selectedItems: () => [],
});

// Transform folders data for display
const transformedFolders = computed(() => {
  return props.folders.map((folder: any) => {
    const fileCount = folder.children?.length || folder.files?.length || 0;
    const totalSize = folder.totalSize || folder.size || 0;
    return {
      ...folder,
      displayName: folder.name || "Untitled",
      icon: getFolderIcon(folder).name,
      iconColor: getFolderIcon(folder).color,
      fileCount: fileCount,
      modifiedAt: formatDate(folder.createdAt || folder.updatedAt),
      itemCount: `${fileCount} ${fileCount === 1 ? 'File' : 'Files'}`,
      size: formatFileSize(parseInt(totalSize.toString())),
    };
  });
});

// Access global move state to disable folders under move
const { moveState } = useFileManagerMove();

function isFolderDisabled(folderId: string) {
  return !!(
    moveState.value.moveMode &&
    moveState.value.selectedFolderIds?.includes(folderId)
  );
}

const emit = defineEmits<{
  "folder-click": [folder: any];
  "toggle-selection": [folderId: string];
  "refresh-folders": [];
}>();

function deleteFolder(folder: any) {
  const { deleteFolder: deleteFolderFromManager } = useFileManager();
  deleteFolderFromManager(folder, () => emit("refresh-folders"));
}
</script>
