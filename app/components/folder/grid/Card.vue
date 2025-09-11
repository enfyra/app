<template>
  <div
    class="group relative"
    @mouseenter="hoveredFolderId = folder.id"
    @mouseleave="hoveredFolderId = null"
  >
    <UContextMenu :items="getContextMenuItems()" :disabled="isFolderDisabled">
      <div
        class="relative bg-white dark:bg-gray-800 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden h-full flex flex-col"
        :class="[
          selectedItems.includes(folder.id)
            ? 'border-primary-500 shadow-lg shadow-primary-500/20 scale-[1.02]'
            : hoveredFolderId === folder.id
            ? 'border-primary-300 dark:border-primary-600 shadow-xl transform -translate-y-1'
            : 'border-gray-200 dark:border-gray-700 shadow-sm lg:hover:shadow-lg',
          isFolderDisabled
            ? 'opacity-60 cursor-not-allowed'
            : '',
        ]"
        @click="handleFolderClick"
      >
        <div
          v-if="isFolderDisabled"
          class="absolute inset-0 z-10 bg-black/20 flex items-center justify-center"
          aria-disabled="true"
          title="Selected folder cannot be destination"
        >
          <span
            class="inline-flex items-center gap-2 text-xs font-medium text-white/95 bg-amber-600/80 px-2.5 py-1 rounded-md"
          >
            <UIcon name="lucide:lock" class="w-3.5 h-3.5" />
            Selected - cannot move here
          </span>
        </div>

        <div
          v-if="isSelectionMode"
          class="absolute top-3 right-3 z-20 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-md"
          @click.stop
        >
          <UCheckbox
            :model-value="selectedItems.includes(folder.id)"
            @update:model-value="() => $emit('toggle-selection', folder.id)"
            size="lg"
          />
        </div>

        <FolderGridPreview :folder="folder" :hovered="hoveredFolderId === folder.id" />

        <div class="p-4 space-y-3 flex-1 flex flex-col">
          <FolderGridEditableName
            :folder="folder"
            :editing-folder-id="editingFolderId"
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
              <span>{{ folder.modifiedAt }}</span>
            </div>
            <div class="flex items-center gap-1">
              <UIcon name="lucide:folder" class="w-3 h-3" />
              <span>{{ folder.itemCount }}</span>
            </div>
          </div>

          <FolderGridActions
            :folder="folder"
            :move-mode="moveMode"
            :dropdown-items="getDropdownMenuItems()"
            @view-folder="$emit('folder-click', folder)"
          />
        </div>
      </div>
    </UContextMenu>
  </div>
</template>

<script setup lang="ts">
// useApi is auto-imported in Nuxt

interface Props {
  folder: any;
  isSelectionMode?: boolean;
  selectedItems: string[];
  moveMode?: boolean;
  isFolderDisabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isSelectionMode: false,
  moveMode: false,
  isFolderDisabled: false,
});

const emit = defineEmits<{
  "folder-click": [folder: any];
  "toggle-selection": [folderId: string];
  "refresh-folders": [];
  "delete-folder": [folder: any];
  "copy-folder-url": [folder: any];
}>();

// Hover state
const hoveredFolderId = ref<string | null>(null);

// Inline editing state
const editingFolderId = ref<string | null>(null);
const editingName = ref("");
const originalName = ref("");
const editingLoading = ref(false);

// Access permissions
const { checkPermissionCondition } = usePermissions();

// Check delete permission for folders
const canDeleteFolder = checkPermissionCondition({
  and: [
    {
      route: "/folder_definition",
      actions: ["delete"],
    },
  ],
});

function handleFolderClick() {
  if (props.isSelectionMode) {
    emit("toggle-selection", props.folder.id);
  } else if (props.isFolderDisabled) {
    return; // Disabled folder, don't navigate
  } else {
    emit("folder-click", props.folder);
  }
}

// Inline rename functions
function startRename() {
  if (props.isSelectionMode) return;
  editingFolderId.value = props.folder.id;
  editingName.value = props.folder.displayName;
  originalName.value = props.folder.displayName;

  nextTick(() => {
    const input = document.querySelector(
      `input[data-editing-id="${props.folder.id}"]`
    ) as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }
  });
}

function cancelEdit() {
  if (editingLoading.value) return;
  editingFolderId.value = null;
  editingName.value = "";
  originalName.value = "";
  editingLoading.value = false;
}

async function saveEdit() {
  if (!editingName.value.trim()) {
    console.error("Folder name cannot be empty");
    return;
  }

  editingLoading.value = true;

  try {
    const { execute: updateFolder, error } = useApi(
      () => `folder_definition/${props.folder.id}`,
      {
        method: "patch",
        errorContext: "Update Folder",
      }
    );

    await updateFolder({
      body: {
        name: editingName.value.trim(),
      },
    });

    if (error.value) {
      editingLoading.value = false;
      return;
    }

    editingFolderId.value = null;
    editingName.value = "";
    originalName.value = "";
    editingLoading.value = false;

    // Show success toast
    const toast = useToast();
    toast.add({
      title: "Success",
      description: "Folder renamed successfully!",
      color: "success",
    });

    emit("refresh-folders");
  } catch (error) {
    editingLoading.value = false;
  }
}

// Get context menu items for folders
function getContextMenuItems() {
  const menuItems: any = [
    [
      {
        label: "Open",
        icon: "lucide:folder-open",
        onSelect: () => {
          emit("folder-click", props.folder);
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
        label: "Copy URL",
        icon: "lucide:copy",
        onSelect: () => {
          emit("copy-folder-url", props.folder);
        },
      },
    ],
  ];

  // Only show delete option if user has permission
  if (canDeleteFolder) {
    menuItems.push([
      {
        label: "Delete",
        icon: "lucide:trash-2",
        color: "error" as const,
        onSelect: () => {
          emit("delete-folder", props.folder);
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
      label: "Open",
      icon: "lucide:folder-open",
      onSelect: () => {
        emit("folder-click", props.folder);
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
      label: "Copy URL",
      icon: "lucide:copy",
      onSelect: () => {
        emit("copy-folder-url", props.folder);
      },
    },
  ];

  // Only show delete option if user has permission
  if (canDeleteFolder) {
    menuItems.push({
      label: "Delete",
      icon: "lucide:trash-2",
      color: "error" as const,
      onSelect: () => {
        emit("delete-folder", props.folder);
      },
    });
  }

  return menuItems;
}
</script>