<template>
  <div
    class="group relative"
    @mouseenter="hoveredFolderId = folder.id"
    @mouseleave="hoveredFolderId = null"
  >
    <UContextMenu :items="getContextMenuItems()" :disabled="isFolderDisabled">
      <div
        class="relative rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden"
        :style="{
          backgroundColor: hoverBgColor,
          borderColor: hoverBorderColor,
          borderWidth: props.selectedItems.includes(props.folder.id) ? '2px' : '1px',
          boxShadow: hoverShadow,
          transform: props.selectedItems.includes(props.folder.id) ? 'scale(1.01)' : 'scale(1)',
          opacity: isFolderDisabled ? '0.6' : '1',
          cursor: isFolderDisabled ? 'not-allowed' : 'pointer'
        }"
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

        <div class="p-4 flex items-start gap-4">
          <div class="flex-shrink-0">
            <FolderGridIconSquare :folder="folder" :hovered="hoveredFolderId === folder.id" />
          </div>

          <div class="flex-1 min-w-0 space-y-1">
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

            <div class="text-xs text-gray-400">
              {{ folder.itemCount }}
          </div>

            <div class="text-xs text-gray-400">
              Updated {{ folder.modifiedAt }}
            </div>
          </div>
        </div>
      </div>
    </UContextMenu>
  </div>
</template>

<script setup lang="ts">

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

const hoveredFolderId = ref<string | null>(null);

const editingFolderId = ref<string | null>(null);
const editingName = ref("");
const originalName = ref("");
const editingLoading = ref(false);

const folderHoverBgColor = computed(() => {
  if (!props.folder) return "#7C3AED";
  
  if (props.folder.color) {
    return props.folder.color;
  }
  
  const colors = ["#3B82F6", "#7C3AED", "#F59E0B", "#14B8A6"];
  const folderId = props.folder.id || props.folder.name || "";
  
  let hash = 0;
  for (let i = 0; i < folderId.length; i++) {
    hash = folderId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  
  return colors[index];
});

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const hoverBgColor = computed(() => {
  if (hoveredFolderId.value === props.folder.id) {
    return hexToRgba(folderHoverBgColor.value, 0.08);
  }
  return 'rgba(21, 27, 46, 0.6)';
});

const hoverBorderColor = computed(() => {
  if (props.selectedItems.includes(props.folder.id)) return '#7C3AED';
  if (hoveredFolderId.value === props.folder.id) {
    return hexToRgba(folderHoverBgColor.value, 0.25);
  }
  return 'rgba(255, 255, 255, 0.06)';
});

const hoverShadow = computed(() => {
  if (props.selectedItems.includes(props.folder.id)) {
    return '0 4px 16px rgba(124, 58, 237, 0.2)';
  }
  if (hoveredFolderId.value === props.folder.id) {
    return `0 2px 8px ${hexToRgba(folderHoverBgColor.value, 0.12)}`;
  }
  return '0 1px 3px rgba(0, 0, 0, 0.2)';
});

const { checkPermissionCondition } = usePermissions();

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
    return;
  } else {
    emit("folder-click", props.folder);
  }
}

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

function getContextMenuItems() {
  const { showFolderDetail } = useFileManager();
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
        label: "View Details",
        icon: "lucide:info",
        onSelect: () => {
          showFolderDetail(props.folder);
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

function getDropdownMenuItems() {
  const { showFolderDetail } = useFileManager();
  const menuItems: any = [
    {
      label: "Open",
      icon: "lucide:folder-open",
      onSelect: () => {
        emit("folder-click", props.folder);
      },
    },
    {
      label: "View Details",
      icon: "lucide:info",
      onSelect: () => {
        showFolderDetail(props.folder);
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