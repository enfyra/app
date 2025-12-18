<template>
  <div
    class="group relative"
  >
    <UContextMenu :items="getContextMenuItems()" :disabled="isFolderDisabled">
      <div
        class="relative rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] transition-all duration-200 cursor-pointer overflow-hidden hover:shadow-theme-md"
        :class="{
          'border-brand-500 shadow-theme-md': props.selectedItems.includes(props.folder.id),
          'hover:border-gray-300 dark:hover:border-gray-700': !props.selectedItems.includes(props.folder.id),
        }"
        :style="{
          borderWidth: props.selectedItems.includes(props.folder.id) ? '2px' : '1px',
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

        <div
          v-if="isSelectionMode"
          class="absolute top-3 right-3 z-20 rounded-md p-1.5 cursor-pointer bg-white dark:bg-gray-800 shadow-theme-xs"
            @click.stop="$emit('toggle-selection', folder.id)"
          >
            <UCheckbox
              :model-value="selectedItems.includes(folder.id)"
              @update:model-value="() => $emit('toggle-selection', folder.id)"
            />
          </div>

        <div class="p-5 flex flex-col h-full">
          <div class="mb-4">
            <FolderGridIconSquare :folder="folder" />
          </div>

          <div class="flex-1 flex flex-col justify-between">
            <div class="mb-3">
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
            </div>

            <div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
              <span>{{ folder.itemCount }}</span>
              <span>{{ folder.size || '0 B' }}</span>
          </div>

            <div class="flex items-center justify-end" @click.stop>
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

const editingFolderId = ref<string | null>(null);
const editingName = ref("");
const originalName = ref("");
const editingLoading = ref(false);

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