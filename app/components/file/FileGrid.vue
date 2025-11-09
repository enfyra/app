<template>
  <div class="space-y-4">
    <div
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4"
    >
      <div v-if="transformedFiles.length > 0" class="contents">
        <FileGridCard
          v-for="file in transformedFiles"
          :key="file.id"
          :file="file"
          :is-selection-mode="isSelectionMode"
          :selected-items="selectedItems"
          @file-click="$emit('file-click', $event)"
          @toggle-selection="$emit('toggle-selection', $event)"
          @view-file="viewFile"
          @refresh-files="$emit('refresh-files')"
          @delete-file="deleteFile"
          @download-file="downloadFile"
          @copy-file-url="handleCopyFileUrl"
          @view-file-details="viewFileDetails"
        />
      </div>

      <div v-else class="col-span-full text-center py-12">
        <UIcon
          name="lucide:file"
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
import { getFileIconAndColor } from "~/utils/file-management/file-icons";
import { formatFileSize } from "~/utils/file-management/file-utils";
import type { FileItem } from "~/utils/types";
import FileGridCard from "./grid/FileGridCard.vue";
import { useFileUrl } from "~/composables/file-manager/useFileUrl";

interface Props {
  files: FileItem[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  isSelectionMode?: boolean;
  selectedItems?: string[];
  copyFileUrl?: (file: any) => void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  emptyTitle: "No files",
  emptyDescription: "No files in this location",
  isSelectionMode: false,
  selectedItems: () => [],
});

const { getFileUrl } = useFileUrl();
const { getId } = useDatabase();

const transformedFiles = computed(() => {
  return props.files.map((file: any) => {
    const iconConfig = getFileIconAndColor(file.mimetype);
    return {
      ...file,
      displayName: file.filename || file.title || "Untitled",
      icon: iconConfig.icon,
      iconColor: iconConfig.color,
      iconBackground: iconConfig.background,
      size: formatFileSize(parseInt(file.filesize || "0")),
      modifiedAt: formatDate(file.updatedAt || file.createdAt || ""),
      assetUrl: getFileUrl(getId(file)),
    };
  });
});

const emit = defineEmits<{
  "file-click": [file: any];
  "toggle-selection": [fileId: string];
  "refresh-files": [];
}>();

function viewFile(file: any) {
  if (file.assetUrl) {
    window.open(file.assetUrl, "_blank");
  }
}

function downloadFile(file: any) {
  if (file.assetUrl) {
    const link = document.createElement("a");
    link.href = file.assetUrl;
    link.download = file.displayName;
    link.click();
  }
}

function handleCopyFileUrl(file: any) {
  if (props.copyFileUrl) {
    props.copyFileUrl(file);
  }
}

function viewFileDetails(file: any) {
  navigateTo(`/storage/management/file/${getId(file)}`);
}

function deleteFile(file: any) {
  const { deleteFile: deleteFileFromManager } = useFileManager();
  deleteFileFromManager(file, () => emit("refresh-files"));
}
</script>
