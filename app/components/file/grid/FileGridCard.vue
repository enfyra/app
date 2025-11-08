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
        class="relative rounded-xl border transition-all duration-300 overflow-hidden"
        :style="{
          background: 'rgba(21, 27, 46, 0.8)',
          backdropFilter: 'blur(20px)',
          borderColor: selectedItems.includes(file.id)
            ? '#7C3AED'
            : hoveredFileId === file.id
            ? '#7C3AED'
            : 'rgba(255, 255, 255, 0.08)',
          borderWidth: selectedItems.includes(file.id) ? '2px' : '1px',
          boxShadow: selectedItems.includes(file.id)
            ? '0 8px 32px rgba(124, 58, 237, 0.3), 0 0 0 1px rgba(124, 58, 237, 0.2)'
            : hoveredFileId === file.id
            ? '0 8px 32px rgba(124, 58, 237, 0.2), 0 4px 16px rgba(0, 0, 0, 0.4)'
            : '0 2px 8px rgba(0, 0, 0, 0.4)',
          transform: `translateY(${hoveredFileId === file.id ? '-2px' : '0'}) scale(${selectedItems.includes(file.id) ? '1.02' : '1'})`,
          opacity: moveState.moveMode ? '0.6' : '1',
          cursor: moveState.moveMode ? 'not-allowed' : 'pointer'
        }"
        @click="handleFileClick"
      >
        <!-- Accent gradient line at top -->
        <div
          class="absolute top-0 left-0 right-0 h-px opacity-60"
          style="background: linear-gradient(90deg, transparent, #7C3AED, transparent)"
        />
        <!-- Selection Checkbox - appears on hover or when selected -->
        <Transition
          enter-active-class="transition duration-200"
          enter-from-class="opacity-0 scale-75"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-200"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-75"
        >
          <div
            v-if="(hoveredFileId === file.id || selectedItems.includes(file.id)) && isSelectionMode"
            class="absolute top-3 right-3 z-20 rounded-md p-1.5 cursor-pointer bg-white dark:bg-gray-800"
            style="box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3)"
            @click.stop="$emit('toggle-selection', file.id)"
          >
            <UCheckbox
              :model-value="selectedItems.includes(file.id)"
              @update:model-value="() => $emit('toggle-selection', file.id)"
            />
          </div>
        </Transition>

        <!-- Preview Area with hover overlay -->
        <div class="relative h-32 overflow-hidden cursor-pointer">
          <div
            class="w-full h-full transition-all duration-300"
            :style="{ filter: hoveredFileId === file.id ? 'blur(4px)' : 'blur(0)' }"
          >
            <Preview :file="file" :hovered="hoveredFileId === file.id" />
          </div>

          <!-- Hover overlay with View icon -->
          <Transition
            enter-active-class="transition duration-300"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-300"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div
              v-if="hoveredFileId === file.id"
              class="absolute inset-0 flex items-center justify-center"
              style="background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(8px)"
            >
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center transform transition-transform duration-300"
                :class="hoveredFileId === file.id ? 'scale-100' : 'scale-0'"
                style="background: linear-gradient(135deg, #7C3AED, #8B5CF6); box-shadow: 0 4px 16px rgba(124, 58, 237, 0.5)"
              >
                <UIcon name="lucide:eye" class="w-6 h-6 text-white" />
              </div>
            </div>
          </Transition>
        </div>

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

          <!-- Metadata Row -->
          <div class="flex flex-col gap-2.5 text-xs" style="color: #94A3B8">
            <div class="flex items-baseline justify-between">
              <div class="flex items-center gap-1.5">
                <UIcon name="lucide:calendar" class="w-3 h-3 flex-shrink-0" />
                <span class="leading-none">{{ file.modifiedAt }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <UIcon name="lucide:file" class="w-3 h-3 flex-shrink-0" />
                <span class="leading-none">{{ file.size }}</span>
              </div>
            </div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <UBadge
                size="lg"
                variant="subtle"
                :color="getStorageColor(file)"
              >
                <template #leading>
                  <UIcon :name="getStorageIcon(file)" class="w-4 h-4" />
                </template>
                {{ getStorageName(file) }}
              </UBadge>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-2 pt-1">
            <!-- Primary View Button -->
            <UButton
              @click="(e) => {
                if (!isSelectionMode) {
                  e.stopPropagation();
                  $emit('view-file', file);
                }
              }"
              class="flex-1 h-8 text-xs font-medium text-white transition-all duration-300"
              style="background: linear-gradient(135deg, #7C3AED, #8B5CF6); box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3)"
            >
              <UIcon name="lucide:eye" class="w-3.5 h-3.5 mr-1.5" />
              View
            </UButton>

            <!-- Dropdown Menu -->
            <div @click="(e) => !isSelectionMode && e.stopPropagation()">
              <UDropdownMenu :items="getDropdownMenuItems()">
                <UButton
                  variant="ghost"
                  class="h-8 w-8 p-0 hover:bg-white/10"
                  :disabled="moveState.moveMode"
                >
                  <UIcon name="lucide:ellipsis-vertical" class="w-4 h-4" style="color: #94A3B8" />
                </UButton>
              </UDropdownMenu>
            </div>
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

// Get storage icon based on type
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

// Get storage name
function getStorageName(file: any) {
  return file.storageConfig?.name || "Local";
}

// Get storage color based on type
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
