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
        class="relative bg-white dark:bg-gray-800 rounded-xl border transition-all duration-300 overflow-hidden"
        :class="[
          selectedItems.includes(file.id)
            ? 'border-primary-500 shadow-lg shadow-primary-500/20 scale-[1.02]'
            : hoveredFileId === file.id
            ? 'border-primary-300 dark:border-primary-600 shadow-xl transform -translate-y-1'
            : 'border-gray-200 dark:border-gray-700 shadow-sm lg:hover:shadow-lg',
          moveState.moveMode
            ? 'opacity-60 cursor-not-allowed'
            : 'cursor-pointer',
        ]"
        @click="handleFileClick"
      >
        <div
          v-if="isSelectionMode"
          class="absolute top-3 right-3 z-20 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-md"
          @click.stop
        >
          <UCheckbox
            :model-value="selectedItems.includes(file.id)"
            @update:model-value="() => $emit('toggle-selection', file.id)"
            size="lg"
          />
        </div>

        <Preview :file="file" :hovered="hoveredFileId === file.id" />

        <div class="p-4 space-y-3">
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

          <div
            class="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500"
          >
            <div class="flex items-center gap-1">
              <UIcon name="lucide:calendar" class="w-3 h-3" />
              <span>{{ file.modifiedAt }}</span>
            </div>
            <div class="flex items-center gap-1">
              <UIcon name="lucide:file" class="w-3 h-3" />
              <span>{{ file.size }}</span>
            </div>
          </div>

          <Actions
            :file="file"
            :move-mode="moveState.moveMode"
            :dropdown-items="getDropdownMenuItems()"
            @view-file="$emit('view-file', file)"
          />
        </div>
      </div>
    </UContextMenu>
  </div>
</template>

<script setup lang="ts">
// useEnfyraApi is auto-imported in Nuxt
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

// Access global move state
const { moveState } = useFileManagerMove();
const { checkPermissionCondition } = usePermissions();

// Check delete permission for files
const canDeleteFile = checkPermissionCondition({
  and: [
    {
      route: "/file_definition",
      actions: ["delete"],
    },
  ],
});

// Hover state
const hoveredFileId = ref<string | null>(null);

// Inline editing state
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

// Inline rename functions
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
    const { execute: updateFile, error } = useEnfyraApi(
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

    // Show success toast
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

// Get context menu items for files
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

// Get dropdown menu items (flat array)
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
</script>
