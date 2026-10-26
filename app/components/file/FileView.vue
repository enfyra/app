<script setup lang="ts">
import { useFileManagerMoveState } from '~/composables/file-manager/useFileManagerMoveState';
import { UIcon, UBadge } from "#components";
import type { FileLibraryRecord, FileLibraryDisplayRow } from '~/types/file';

interface Props {
  files: FileLibraryRecord[];
  viewMode: "grid" | "list";
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  isSelectionMode?: boolean;
  selectedItems?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  emptyTitle: "No files",
  emptyDescription: "No files in this location",
  isSelectionMode: false,
  selectedItems: () => [],
});

const emit = defineEmits<{
  "file-click": [file: FileLibraryRecord];
  "toggle-selection": [fileId: string];
  "refresh-files": [];
}>();

const moveState = useFileManagerMoveState();
const { checkPermissionCondition } = usePermissions();
const { getId } = useDatabase();

const canDeleteFile = checkPermissionCondition({
  and: [
    {
      route: "/enfyra_file",
      methods: ["DELETE"],
    },
  ],
});

const debouncedLoading = ref(false);
let loadingTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => props.loading,
  (value) => {
    if (loadingTimer) {
      clearTimeout(loadingTimer);
      loadingTimer = undefined;
    }
    if (value) {
      loadingTimer = setTimeout(() => {
        debouncedLoading.value = true;
      }, 180);
    } else {
      debouncedLoading.value = false;
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  if (loadingTimer) clearTimeout(loadingTimer);
});

const { getFileUrl } = useFileUrl();

const transformedFiles = computed<FileLibraryDisplayRow[]>(() => {
  return props.files.map((file) => ({
    ...file,
    assetUrl: getFileUrl(getId(file)),
    displayName: file.filename || file.title || "Untitled",
    formattedUpdatedAt: formatDate(file.updatedAt || ""),
  }));
});

const { buildColumn, buildActionsColumn } = useDataTableColumns<FileLibraryDisplayRow>();

function viewFile(file: FileLibraryDisplayRow) {
  if (file.assetUrl) {
    window.open(file.assetUrl, "_blank");
  }
}

function downloadFile(file: FileLibraryDisplayRow) {
  if (file.assetUrl) {
    const link = document.createElement("a");
    link.href = file.assetUrl;
    link.download = file.displayName;
    link.click();
  }
}

function copyFileUrl(file: FileLibraryDisplayRow) {
  if (file.assetUrl) {
    navigator.clipboard.writeText(window.location.origin + file.assetUrl);
    const notify = useNotify();
    notify.success("Success", "URL copied to clipboard");
  }
}

function deleteFile(file: FileLibraryRecord) {
  const { deleteFile } = useFileManager();
  deleteFile(file, () => emit("refresh-files"));
}

const fileColumns = computed(() => [
  buildColumn({
    id: "filename",
    header: "Name",
    cell: ({ row }) => {
      const file = row.original;
      return h("div", { class: "flex items-center gap-2 min-w-0" }, [
        h(
          "div",
          {
            class: `w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              getFileIconAndColor(file.mimetype || file.type || "").background
            }`,
          },
          [
            h(UIcon, {
              name: getFileIconAndColor(file.mimetype || file.type || "").icon,
              class: `w-4 h-4 ${
                getFileIconAndColor(file.mimetype || file.type || "").color
              }`,
            }),
          ]
        ),
        h("div", { class: "min-w-0 flex-1" }, [
          h(
            "p",
            { class: "font-medium text-[var(--text-primary)] truncate" },
            file.filename || file.displayName || "Unknown File"
          ),
        ]),
      ]);
    },
  }),
  buildColumn({
    id: "storage",
    header: "Storage",
    cell: ({ row }) => {
      const file = row.original;
      const storageType = file.storageConfig?.type || "Local Storage";
      const storageName = file.storageConfig?.name || "Local";

      const iconMap: Record<string, string> = {
        "Amazon S3": "lucide:cloud",
        "Google Cloud Storage": "lucide:cloud",
        "Cloudflare R2": "lucide:cloud",
        "Local Storage": "lucide:hard-drive",
      };

      const colorMap: Record<string, "primary" | "info" | "warning" | "neutral"> = {
        "Amazon S3": "primary",
        "Google Cloud Storage": "info",
        "Cloudflare R2": "warning",
        "Local Storage": "neutral",
      };

      return h(UBadge, {
        size: "md",
        variant: "subtle",
        color: colorMap[storageType] || "neutral",
      }, {
        leading: () => h(UIcon, {
          name: iconMap[storageType] || "lucide:database",
          class: "w-4 h-4",
        }),
        default: () => storageName,
      });
    },
  }),
  buildColumn({
    id: "filesize",
    header: "Size",
    cell: ({ row }) => {
      const file = row.original;
      const filesize = file.filesize || file.size || 0;
      return formatFileSize(parseInt(filesize.toString()));
    },
  }),
  buildColumn({
    id: "formattedUpdatedAt",
    header: "Modified",
    cell: ({ getValue }) => {
      const value = getValue() as string;
      return value || "-";
    },
  }),
  buildActionsColumn({
    width: 60,
    actions: [
      {
        label: "View",
        icon: "i-lucide-eye",
        onSelect: (file) => viewFile(file),
      },
      {
        label: "Download",
        icon: "i-lucide-download",
        onSelect: (file) => downloadFile(file),
      },
      {
        label: "Copy URL",
        icon: "i-lucide-copy",
        onSelect: (file) => copyFileUrl(file),
      },
      {
        label: "Details",
        icon: "i-lucide-info",
        onSelect: (file) => navigateTo(`/storage/management/file/${getId(file)}`),
      },
      ...(canDeleteFile
        ? [
            {
              label: "Delete",
              icon: "i-lucide-trash-2",
              color: "error" as const,
              onSelect: (file: FileLibraryDisplayRow) => deleteFile(file),
            },
          ]
        : []),
    ],
  }),
]);

function handleFileClick(file: FileLibraryRecord) {
  emit("file-click", file);
}

function toggleItemSelection(fileId: string) {
  emit("toggle-selection", fileId);
}

function handleSelectionChange(selectedRows: FileLibraryRecord[]) {
  const selectedIds = new Set(selectedRows.map((row) => String(getId(row))));
  const currentFileSelections = new Set(props.selectedItems.map(String));

  for (const file of props.files) {
    const id = String(getId(file));
    if (selectedIds.has(id) !== currentFileSelections.has(id)) emit("toggle-selection", id);
  }
}

function getContextMenuItems(row: unknown) {
  const file = transformedFiles.value.find(file => file === row);
  if (!file) return [];
  const menuItems: any = [
    [
      {
        label: "View",
        icon: "lucide:eye",
        onSelect: () => {
          viewFile(file);
        },
      },
      {
        label: "Download",
        icon: "lucide:download",
        onSelect: () => {
          downloadFile(file);
        },
      },
      {
        label: "Copy URL",
        icon: "lucide:copy",
        onSelect: () => {
          copyFileUrl(file);
        },
      },
      {
        label: "Details",
        icon: "lucide:info",
        onSelect: () => {
          navigateTo(`/storage/management/file/${getId(file)}`);
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
          deleteFile(file);
        },
      },
    ]);
  }

  return menuItems;
}
</script>

<template>
  <div>
    <Transition name="loading-fade" mode="out-in">
      <div
        v-if="debouncedLoading && files.length === 0"
        class="col-span-full"
      >
        <CommonLoadingState type="card" />
      </div>

      <div v-else-if="transformedFiles.length > 0" key="content">
        <FileGrid
          v-if="viewMode === 'grid'"
          :files="transformedFiles"
          :view-mode="viewMode"
          :loading="false"
          :empty-title="emptyTitle"
          :empty-description="emptyDescription"
          :is-selection-mode="isSelectionMode"
          :selected-items="selectedItems"
          :copy-file-url="copyFileUrl"
          @file-click="handleFileClick"
          @toggle-selection="toggleItemSelection"
          @refresh-files="() => emit('refresh-files')"
        />

        <DataTableLazy
          v-else-if="viewMode === 'list'"
          header-name="Files"
          :data="transformedFiles"
          :columns="fileColumns"
          :loading="false"
          :enable-row-selection="!moveState.moveMode"
          :selected-row-ids="selectedItems"
          @update:selected-rows="handleSelectionChange"
          v-bind="!isSelectionMode && !moveState.moveMode ? { contextMenuItems: getContextMenuItems } : {}"
          @row-click="handleFileClick"
        />
      </div>

      <div
        v-else-if="!loading && transformedFiles.length === 0"
        key="empty"
        class="text-center py-12"
      >
        <UIcon
          name="lucide:file"
          class="w-16 h-16 text-[var(--text-quaternary)] mx-auto mb-4"
        />
        <p class="text-lg font-medium text-[var(--text-tertiary)]">
          {{ emptyTitle }}
        </p>
        <p class="text-sm text-[var(--text-quaternary)] mt-1">{{ emptyDescription }}</p>
      </div>
    </Transition>
  </div>
</template>
