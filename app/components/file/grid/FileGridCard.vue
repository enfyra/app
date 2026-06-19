<template>
  <div class="group relative">
    <UContextMenu
      :items="moveState.moveMode ? [] : getContextMenuItems()"
      :disabled="moveState.moveMode"
    >
      <div
        class="relative overflow-hidden rounded-xl surface-card transition-all duration-200 cursor-pointer hover:shadow-panel-md"
        :class="{
          'border-brand-500 shadow-panel-md': selectedItems.includes(file.id),
          'hover:border-[var(--border-strong)]': !selectedItems.includes(file.id),
        }"
        :style="{
          borderWidth: selectedItems.includes(file.id) ? '2px' : '1px',
          opacity: moveState.moveMode ? '0.6' : '1',
          cursor: moveState.moveMode ? 'not-allowed' : 'pointer',
        }"
        @click="handleFileClick"
      >
        <div class="relative aspect-[4/3] overflow-hidden bg-[var(--surface-muted)]">
          <CommonLazyImage
            v-if="file.isImage"
            :src="file.thumbnailUrl"
            :alt="file.displayName"
            class="h-full w-full"
            container-class="h-full w-full"
            object-fit="cover"
            :show-error-text="false"
          />

          <div v-else class="flex h-full items-center justify-center">
            <div
              class="flex h-20 w-20 items-center justify-center rounded-2xl"
              :class="file.iconBackground"
            >
              <UIcon :name="file.icon" :class="file.iconColor" size="36" />
            </div>
          </div>

          <div
            v-if="isSelectionMode"
            class="absolute right-3 top-3 z-20 rounded-md bg-[var(--surface-default)]/95 p-1.5 shadow-theme-xs backdrop-blur"
            @click.stop="handleCheckboxClick"
          >
            <UCheckbox
              :model-value="selectedItems.includes(file.id)"
              @update:model-value="handleCheckboxClick"
            />
          </div>

          <div
            class="absolute left-3 top-3 rounded-full bg-[var(--surface-default)]/90 px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] shadow-theme-xs backdrop-blur"
          >
            {{ fileTypeLabel }}
          </div>
        </div>

        <div class="space-y-4 p-4">
          <div class="min-w-0">
            <FileGridEditableName
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

          <div class="flex items-center justify-between gap-3 text-xs text-[var(--text-tertiary)]">
            <span class="truncate">{{ file.size }}</span>
            <span class="truncate">{{ file.modifiedAt || "No date" }}</span>
          </div>

          <div
            v-if="!moveState.moveMode"
            class="flex items-center justify-between gap-3"
            @click.stop
          >
            <UBadge
              :color="getStorageColor(file)"
              variant="subtle"
              size="sm"
              class="min-w-0"
            >
              <UIcon :name="getStorageIcon(file)" class="mr-1 h-3 w-3" />
              <span class="truncate">{{ getStorageName(file) }}</span>
            </UBadge>

            <UDropdownMenu :items="getDropdownMenuItems()">
              <UButton
                icon="lucide:more-horizontal"
                variant="ghost"
                color="neutral"
                size="sm"
                square
                @click.stop
              />
            </UDropdownMenu>
          </div>
        </div>
      </div>
    </UContextMenu>
  </div>
</template>

<script setup lang="ts">
interface Props {
  file: FileItem & {
    displayName: string;
    icon: string;
    iconColor: string;
    iconBackground: string;
    size: string;
    modifiedAt: string;
    assetUrl: string;
    thumbnailUrl: string;
    isImage?: boolean;
    type?: string;
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
      route: "/enfyra_file",
      methods: ["DELETE"],
    },
  ],
});

const editingFileId = ref<string | null>(null);
const editingName = ref("");
const originalName = ref("");
const editingLoading = ref(false);

const fileTypeLabel = computed(() => {
  const mimetype = props.file.mimetype || props.file.type || "";
  if (mimetype.startsWith("image/") || props.file.isImage) return "Image";
  if (mimetype.startsWith("video/")) return "Video";
  if (mimetype.startsWith("audio/")) return "Audio";
  if (mimetype.includes("pdf")) return "PDF";
  if (mimetype.includes("zip") || mimetype.includes("archive")) return "Archive";
  if (mimetype.startsWith("text/")) return "Text";
  return "File";
});

function handleFileClick() {
  if (props.isSelectionMode) {
    emit("toggle-selection", props.file.id);
  } else if (moveState.value.moveMode) {
    const notify = useNotify();
    notify.info("Cannot open file", "Cancel move mode to access files.");
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
      `input[data-editing-id="${props.file.id}"]`,
    ) as HTMLInputElement;
    input?.focus();
    input?.select();
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
    const notify = useNotify();
    notify.warning("Invalid name", "File name cannot be empty.");
    return;
  }

  editingLoading.value = true;

  try {
    const { execute: updateFile, error } = useApi(
      () => `enfyra_file/${props.file.id}`,
      {
        method: "patch",
        errorContext: "Update File",
      },
    );

    await updateFile({
      body: {
        filename: editingName.value.trim(),
        title: editingName.value.trim(),
      },
    });

    if (error.value) return;

    editingFileId.value = null;
    editingName.value = "";
    originalName.value = "";

    const notify = useNotify();
    notify.success("Success", "File renamed successfully!");

    emit("refresh-files");
  } finally {
    editingLoading.value = false;
  }
}

function getContextMenuItems() {
  const menuItems: any = [
    [
      {
        label: "View",
        icon: "lucide:eye",
        onSelect: () => emit("view-file", props.file),
      },
      {
        label: "Rename",
        icon: "lucide:edit-3",
        onSelect: startRename,
      },
      {
        label: "Download",
        icon: "lucide:download",
        onSelect: () => emit("download-file", props.file),
      },
      {
        label: "Copy URL",
        icon: "lucide:copy",
        onSelect: () => emit("copy-file-url", props.file),
      },
      {
        label: "Details",
        icon: "lucide:info",
        onSelect: () => emit("view-file-details", props.file),
      },
    ],
  ];

  if (canDeleteFile) {
    menuItems.push([
      {
        label: "Delete",
        icon: "lucide:trash-2",
        color: "error" as const,
        onSelect: () => emit("delete-file", props.file),
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
      onSelect: () => emit("view-file", props.file),
    },
    {
      label: "Rename",
      icon: "lucide:edit-3",
      onSelect: startRename,
    },
    {
      label: "Download",
      icon: "lucide:download",
      onSelect: () => emit("download-file", props.file),
    },
    {
      label: "Copy URL",
      icon: "lucide:copy",
      onSelect: () => emit("copy-file-url", props.file),
    },
    {
      label: "Details",
      icon: "lucide:info",
      onSelect: () => emit("view-file-details", props.file),
    },
  ];

  if (canDeleteFile) {
    menuItems.push({
      label: "Delete",
      icon: "lucide:trash-2",
      color: "error" as const,
      onSelect: () => emit("delete-file", props.file),
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
  const colorMap: Record<
    string,
    "primary" | "secondary" | "info" | "success" | "warning" | "error" | "neutral"
  > = {
    "Amazon S3": "primary",
    "Google Cloud Storage": "info",
    "Cloudflare R2": "warning",
    "Local Storage": "neutral",
  };
  return colorMap[storageType] || "neutral";
}
</script>
