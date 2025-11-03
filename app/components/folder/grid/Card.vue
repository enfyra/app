<template>
  <div
    class="group relative"
    @mouseenter="hoveredFolderId = folder.id"
    @mouseleave="hoveredFolderId = null"
  >
    <UContextMenu :items="getContextMenuItems()" :disabled="isFolderDisabled">
      <div
        class="relative rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden h-full flex flex-col"
        :style="{
          background: 'rgba(21, 27, 46, 0.8)',
          backdropFilter: 'blur(20px)',
          borderColor: selectedItems.includes(folder.id)
            ? '#7C3AED'
            : hoveredFolderId === folder.id
            ? '#7C3AED'
            : 'rgba(255, 255, 255, 0.08)',
          borderWidth: selectedItems.includes(folder.id) ? '2px' : '1px',
          boxShadow: selectedItems.includes(folder.id)
            ? '0 8px 32px rgba(124, 58, 237, 0.3), 0 0 0 1px rgba(124, 58, 237, 0.2)'
            : hoveredFolderId === folder.id
            ? '0 8px 32px rgba(124, 58, 237, 0.2), 0 4px 16px rgba(0, 0, 0, 0.4)'
            : '0 2px 8px rgba(0, 0, 0, 0.4)',
          transform: `translateY(${hoveredFolderId === folder.id ? '-2px' : '0'}) scale(${selectedItems.includes(folder.id) ? '1.02' : '1'})`,
          opacity: isFolderDisabled ? '0.6' : '1',
          cursor: isFolderDisabled ? 'not-allowed' : 'pointer'
        }"
        @click="handleFolderClick"
      >
        <!-- Accent gradient line at top -->
        <div
          class="absolute top-0 left-0 right-0 h-px opacity-60"
          style="background: linear-gradient(90deg, transparent, #7C3AED, transparent)"
        />
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
            v-if="(hoveredFolderId === folder.id || selectedItems.includes(folder.id)) && isSelectionMode"
            class="absolute top-3 right-3 z-20 rounded-md p-1.5 cursor-pointer bg-white dark:bg-gray-800"
            style="box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3)"
            @click.stop="$emit('toggle-selection', folder.id)"
          >
            <UCheckbox
              :model-value="selectedItems.includes(folder.id)"
              @update:model-value="() => $emit('toggle-selection', folder.id)"
            />
          </div>
        </Transition>

        <!-- Preview Area with hover overlay -->
        <div class="relative h-32 overflow-hidden cursor-pointer">
          <div
            class="w-full h-full transition-all duration-300"
            :style="{ filter: hoveredFolderId === folder.id ? 'blur(4px)' : 'blur(0)' }"
          >
            <FolderGridPreview :folder="folder" :hovered="hoveredFolderId === folder.id" />
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
              v-if="hoveredFolderId === folder.id"
              class="absolute inset-0 flex items-center justify-center"
              style="background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(8px)"
            >
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center transform transition-transform duration-300"
                :class="hoveredFolderId === folder.id ? 'scale-100' : 'scale-0'"
                style="background: linear-gradient(135deg, #7C3AED, #8B5CF6); box-shadow: 0 4px 16px rgba(124, 58, 237, 0.5)"
              >
                <UIcon name="lucide:folder-open" class="w-6 h-6 text-white" />
              </div>
            </div>
          </Transition>
        </div>

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

          <!-- Metadata Row -->
          <div class="flex items-center justify-between text-xs" style="color: #94A3B8">
            <div class="flex items-center gap-1.5">
              <UIcon name="lucide:calendar" class="w-3 h-3" />
              <span>{{ folder.modifiedAt }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <UIcon name="lucide:folder" class="w-3 h-3" />
              <span>{{ folder.itemCount }}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-2 pt-1">
            <!-- Primary Open Button -->
            <UButton
              @click="(e) => {
                if (!isSelectionMode) {
                  e.stopPropagation();
                  $emit('folder-click', folder);
                }
              }"
              class="flex-1 h-8 text-xs font-medium text-white transition-all duration-300"
              style="background: linear-gradient(135deg, #7C3AED, #8B5CF6); box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3)"
            >
              <UIcon name="lucide:folder-open" class="w-3.5 h-3.5 mr-1.5" />
              Open
            </UButton>

            <!-- Dropdown Menu -->
            <div @click="(e) => !isSelectionMode && e.stopPropagation()">
              <UDropdownMenu :items="getDropdownMenuItems()">
                <UButton
                  variant="ghost"
                  class="h-8 w-8 p-0 hover:bg-white/10"
                  :disabled="moveMode"
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