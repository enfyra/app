<template>
  <div
    class="group relative"
    @mouseenter="hoveredFileId = file.id"
    @mouseleave="hoveredFileId = null"
  >
    <UContextMenu
      :items="moveState.moveMode ? [] : getContextMenuItems()"
      :disabled="moveState.moveMode"
    >
      <div
        class="relative rounded-xl border transition-all duration-200 overflow-hidden cursor-pointer"
        :class="{
          'border-purple-500 shadow-lg shadow-purple-500/20': selectedItems.includes(file.id),
          'border-gray-800/50 hover:border-gray-700/50': !selectedItems.includes(file.id) && hoveredFileId === file.id,
          'border-gray-800/30': !selectedItems.includes(file.id) && hoveredFileId !== file.id,
        }"
        :style="{
          background: 'rgba(21, 27, 46, 0.6)',
          borderWidth: selectedItems.includes(file.id) ? '2px' : '1px',
          boxShadow: selectedItems.includes(file.id)
            ? '0 8px 32px rgba(124, 58, 237, 0.2)'
            : hoveredFileId === file.id
            ? '0 4px 16px rgba(0, 0, 0, 0.3)'
            : '0 1px 3px rgba(0, 0, 0, 0.2)',
          transform: hoveredFileId === file.id ? 'translateY(-4px)' : 'translateY(0)',
          opacity: moveState.moveMode ? '0.6' : '1',
          cursor: moveState.moveMode ? 'not-allowed' : 'pointer'
        }"
        @click="handleFileClick"
      >
        <div class="h-28 relative overflow-hidden rounded-t-xl">
          <Preview :file="file" :hovered="hoveredFileId === file.id" />
          
          <div 
            v-if="isSelectionMode || selectedItems.includes(file.id)"
            class="absolute top-3 left-3 z-30 cursor-pointer"
            @click.stop="handleCheckboxClick"
        >
          <div
              class="w-5 h-5 rounded bg-gray-900/90 border border-gray-700 flex items-center justify-center p-1"
              @click.stop="handleCheckboxClick"
          >
            <UCheckbox
              :model-value="selectedItems.includes(file.id)"
                @update:model-value="handleCheckboxClick"
                @click.stop="handleCheckboxClick"
                class="!m-0 pointer-events-auto"
            />
          </div>
          </div>

          <div 
            v-if="!moveState.moveMode"
            class="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
            @click.stop
          >
            <UDropdownMenu :items="getDropdownMenuItems()">
              <UButton
                variant="ghost"
                size="sm"
                class="h-8 w-8 p-0 bg-gray-900/80 hover:bg-gray-800/80"
              >
                <UIcon name="lucide:more-vertical" class="w-4 h-4 text-gray-400" />
              </UButton>
            </UDropdownMenu>
            </div>
        </div>

        <div class="p-3 space-y-2">
          <EditableName
            :file="file"
            :editing-file-id="editingFileId"
            v-model:editing-name="editingName"
            :editing-loading="editingLoading"
            :original-name="originalName"
            :is-selection-mode="isSelectionMode"
            @start-rename="startRename"
            @save-edit="saveEdit"
            @cancel-edit="cancelEdit"
          />

          <div class="flex items-center justify-between text-xs text-gray-400">
            <span>{{ file.size }}</span>
            <span>{{ file.modifiedAt }}</span>
              </div>

          <div class="flex items-center">
              <UBadge
              size="sm"
                variant="subtle"
                :color="getStorageColor(file)"
              >
                <template #leading>
                <UIcon :name="getStorageIcon(file)" class="w-3.5 h-3.5" />
                </template>
                {{ getStorageName(file) }}
              </UBadge>
          </div>
        </div>
      </div>
    </UContextMenu>
  </div>
</template>

<script setup lang="ts">
import type { FileItem } from "~/utils/types";
import Preview from "./FileGridPreview.vue";
import EditableName from "./FileGridEditableName.vue";
import Actions from "./FileGridActions.vue";

interface Props {
  file: FileItem & {
    displayName: string;
    icon: string;
    iconColor: string;
    iconBackground: string;
    size: string;
    modifiedAt: string;
    assetUrl: string;
    storageConfig?: {
      type?: string;
      name?: string;
    };
  };
  isSelectionMode?: boolean;
  selectedItems: string[];
}

const props = withDefaults(defineProps<Props>(), {
  isSelectionMode: false,
});

const emit = defineEmits<{
  "file-click": [file: any];
  "toggle-selection": [fileId: string];
  "view-file": [file: any];
  "refresh-files": [];
  "delete-file": [file: any];
  "download-file": [file: any];
  "copy-file-url": [file: any];
  "view-file-details": [file: any];
}>();

const { moveState } = useFileManagerMove();
const { checkPermissionCondition } = usePermissions();

const canDeleteFile = checkPermissionCondition({
  and: [
    {
      route: "/file_definition",
      actions: ["delete"],
    },
  ],
});

const hoveredFileId = ref<string | null>(null);

const editingFileId = ref<string | null>(null);
const editingName = ref("");
const originalName = ref("");
const editingLoading = ref(false);

function handleFileClick() {
  if (props.isSelectionMode) {
    emit("toggle-selection", props.file.id);
  } else if (moveState.value.moveMode) {
    const toast = useToast();
    toast.add({
      title: "Cannot open file",
      description: "Cancel move mode to access files.",
      color: "info",
    });
    return;
  } else {
    emit("file-click", props.file);
  }
}

function handleCheckboxClick() {
  emit("toggle-selection", props.file.id);
}

function startRename() {
  if (props.isSelectionMode) return;
  editingFileId.value = props.file.id;
  editingName.value = props.file.displayName;
  originalName.value = props.file.displayName;

  nextTick(() => {
    const input = document.querySelector(
      `input[data-editing-id="${props.file.id}"]`
    ) as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }
  });
}

function cancelEdit() {
  if (editingLoading.value) return;
  editingFileId.value = null;
  editingName.value = "";
  originalName.value = "";
  editingLoading.value = false;
}

async function saveEdit() {
  if (!editingName.value.trim()) {
    console.error("File name cannot be empty");
    return;
  }

  editingLoading.value = true;

  try {
    const { execute: updateFile, error } = useApi(
      () => `file_definition/${props.file.id}`,
      {
        method: "patch",
        errorContext: "Update File",
      }
    );

    await updateFile({
      body: {
        filename: editingName.value.trim(),
        title: editingName.value.trim(),
      },
    });

    if (error.value) {
      editingLoading.value = false;
      return;
    }

    editingFileId.value = null;
    editingName.value = "";
    originalName.value = "";
    editingLoading.value = false;

    const toast = useToast();
    toast.add({
      title: "Success",
      description: "File renamed successfully!",
      color: "success",
    });

    emit("refresh-files");
  } catch (error) {
    editingLoading.value = false;
  }
}

function getContextMenuItems() {
  const menuItems: any = [
    [
      {
        label: "View",
        icon: "lucide:eye",
        onSelect: () => {
          emit("view-file", props.file);
        },
      },
      {
        label: "Rename",
        icon: "lucide:edit-3",
        onSelect: () => {
          startRename();
        },
      },
      {
        label: "Download",
        icon: "lucide:download",
        onSelect: () => {
          emit("download-file", props.file);
        },
      },
      {
        label: "Copy URL",
        icon: "lucide:copy",
        onSelect: () => {
          emit("copy-file-url", props.file);
        },
      },
      {
        label: "Details",
        icon: "lucide:info",
        onSelect: () => {
          emit("view-file-details", props.file);
        },
      },
    ],
  ];

  // Only show delete option if user has permission
  if (canDeleteFile) {
    menuItems.push([
      {
        label: "Delete",
        icon: "lucide:trash-2",
        color: "error" as const,
        onSelect: () => {
          emit("delete-file", props.file);
        },
      },
    ]);
  }

  return menuItems;
}

function getDropdownMenuItems() {
  const menuItems: any = [
    {
      label: "View",
      icon: "lucide:eye",
      onSelect: () => {
        emit("view-file", props.file);
      },
    },
    {
      label: "Rename",
      icon: "lucide:edit-3",
      onSelect: () => {
        startRename();
      },
    },
    {
      label: "Download",
      icon: "lucide:download",
      onSelect: () => {
        emit("download-file", props.file);
      },
    },
    {
      label: "Copy URL",
      icon: "lucide:copy",
      onSelect: () => {
        emit("copy-file-url", props.file);
      },
    },
    {
      label: "Details",
      icon: "lucide:info",
      onSelect: () => {
        emit("view-file-details", props.file);
      },
    },
  ];

  // Only show delete option if user has permission
  if (canDeleteFile) {
    menuItems.push({
      label: "Delete",
      icon: "lucide:trash-2",
      color: "error" as const,
      onSelect: () => {
        emit("delete-file", props.file);
      },
    });
  }

  return menuItems;
}

function getStorageIcon(file: any) {
  const storageType = file.storageConfig?.type || "Local Storage";
  const iconMap: Record<string, string> = {
    "Amazon S3": "lucide:cloud",
    "Google Cloud Storage": "lucide:cloud",
    "Cloudflare R2": "lucide:cloud",
    "Local Storage": "lucide:hard-drive",
  };
  return iconMap[storageType] || "lucide:database";
}

function getStorageName(file: any) {
  return file.storageConfig?.name || "Local";
}

function getStorageColor(file: any) {
  const storageType = file.storageConfig?.type || "Local Storage";
  const colorMap: Record<string, "primary" | "secondary" | "info" | "success" | "warning" | "error" | "neutral"> = {
    "Amazon S3": "primary",
    "Google Cloud Storage": "info",
    "Cloudflare R2": "warning",
    "Local Storage": "neutral",
  };
  return colorMap[storageType] || "neutral";
}
</script>
