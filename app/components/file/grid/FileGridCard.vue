<template>
  <div
    class="group relative"
  >
    <UContextMenu
      :items="moveState.moveMode ? [] : getContextMenuItems()"
      :disabled="moveState.moveMode"
    >
      <div
        class="relative rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] transition-all duration-200 overflow-hidden cursor-pointer hover:shadow-theme-md"
        :class="{
          'border-brand-500 shadow-theme-md': selectedItems.includes(file.id),
          'hover:border-gray-300 dark:hover:border-gray-700': !selectedItems.includes(file.id),
        }"
        :style="{
          borderWidth: selectedItems.includes(file.id) ? '2px' : '1px',
          opacity: moveState.moveMode ? '0.6' : '1',
          cursor: moveState.moveMode ? 'not-allowed' : 'pointer'
        }"
        @click="handleFileClick"
      >
        <div class="p-5 flex items-start gap-4 h-full">
          <div class="flex-shrink-0">
            <div class="w-12 h-12 rounded-lg flex items-center justify-center" :class="getFileIconBgClass()">
              <UIcon
                :name="file.icon"
                :class="getFileIconColor()"
                size="24"
            />
          </div>
          </div>

          <div class="flex-1 flex flex-col justify-between min-w-0">
            <div class="mb-3">
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
            </div>

            <div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
            <span>{{ file.size }}</span>
            <span>{{ file.modifiedAt }}</span>
              </div>

            <div v-if="!moveState.moveMode" class="flex items-center justify-between" @click.stop>
              <UBadge
                :color="getStorageColor(file)"
                variant="soft"
                size="sm"
              >
                <UIcon :name="getStorageIcon(file)" class="w-3 h-3 mr-1" />
                {{ getStorageName(file) }}
              </UBadge>
              <UDropdownMenu :items="getDropdownMenuItems()">
                <UButton
                  variant="soft"
                  size="sm"
                  class="h-8 w-8 p-0"
                  @click.stop
                >
                  <UIcon name="lucide:more-vertical" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </UButton>
              </UDropdownMenu>
            </div>
          </div>

          <div
            v-if="isSelectionMode"
            class="absolute top-3 right-3 z-20 rounded-md p-1.5 cursor-pointer bg-white dark:bg-gray-800 shadow-theme-xs"
            @click.stop="handleCheckboxClick"
          >
            <UCheckbox
              :model-value="selectedItems.includes(file.id)"
              @update:model-value="handleCheckboxClick"
            />
          </div>
        </div>
      </div>
    </UContextMenu>
  </div>
</template>

<script setup lang="ts">
import type { FileItem } from "~/utils/types";
import EditableName from "./FileGridEditableName.vue";
import { getFileColor } from "~/utils/file-management/file-icons";

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

const getFileIconBgClass = () => {
  const mimetype = props.file.mimetype || '';
  if (mimetype.startsWith('image/')) {
    return 'bg-success-50 dark:bg-success-500/20';
  }
  if (mimetype.startsWith('video/')) {
    return 'bg-purple-50 dark:bg-purple-500/20';
  }
  if (mimetype.startsWith('audio/')) {
    return 'bg-primary-50 dark:bg-primary-500/20';
  }
  return 'bg-gray-50 dark:bg-gray-500/20';
};

const getFileIconColor = () => {
  return getFileColor(props.file.mimetype || '');
};
</script>
