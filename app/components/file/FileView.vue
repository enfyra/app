<script setup lang="ts">
import { UIcon } from "#components";

interface Props {
  files: any[];
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
  "file-click": [file: any];
  "toggle-selection": [fileId: string];
  "refresh-files": [];
}>();

const { isMounted } = useMounted();

// Get move state to disable selection during move mode
const { moveState } = useFileManagerMove();

// Import permissions
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

// Use file URL composable
const { getFileUrl } = useFileUrl();

// Transform files data to include assetUrl
const transformedFiles = computed(() => {
  return props.files.map((file: any) => ({
    ...file,
    assetUrl: getFileUrl(file.id),
    displayName: file.filename || file.title || "Untitled",
  }));
});

// Data table columns for list view
const { buildColumn, buildActionsColumn } = useDataTableColumns();

// File actions
function viewFile(file: any) {
  if (file.assetUrl) {
    window.open(file.assetUrl, "_blank");
  }
}

function downloadFile(file: any) {
  if (file.assetUrl) {
    const link = document.createElement("a");
    link.href = file.assetUrl;
    link.download = file.displayName;
    link.click();
  }
}

function copyFileUrl(file: any) {
  if (file.assetUrl) {
    navigator.clipboard.writeText(window.location.origin + file.assetUrl);
    const toast = useToast();
    toast.add({
      title: "Success",
      description: "URL copied to clipboard",
      color: "success",
    });
  }
}

function deleteFile(file: any) {
  const { deleteFile } = useFileManager();
  deleteFile(file, () => emit("refresh-files"));
}

// Build file columns for DataTable
const fileColumns = computed(() => [
  buildColumn({
    id: "filename",
    header: "Name",
    cell: ({ row }) => {
      const file = row.original;
      return h("div", { class: "flex items-center gap-2" }, [
        h(
          "div",
          {
            class: `w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              getFileIconAndColor(file.mimetype || file.type).background
            }`,
          },
          [
            h(UIcon, {
              name: getFileIconAndColor(file.mimetype || file.type).icon,
              class: `w-4 h-4 ${
                getFileIconAndColor(file.mimetype || file.type).color
              }`,
            }),
          ]
        ),
        h("div", { class: "min-w-0 flex-1" }, [
          h(
            "p",
            { class: "font-medium text-gray-900 dark:text-white truncate" },
            file.filename || file.displayName || "Unknown File"
          ),
        ]),
      ]);
    },
  }),
  buildColumn({
    id: "size",
    header: "Size",
    cell: ({ getValue }) => {
      const size = getValue() as string | number;
      return size ? `${size}` : "-";
    },
  }),
  buildColumn({
    id: "updatedAt",
    header: "Modified",
    format: "datetime",
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
        onSelect: (file) => navigateTo(`/files/${file.id}`),
      },
      // Only show delete action if user has permission
      ...(canDeleteFile
        ? [
            {
              label: "Delete",
              icon: "i-lucide-trash-2",
              color: "error" as const,
              onSelect: (file: any) => deleteFile(file),
            },
          ]
        : []),
    ],
  }),
]);

function handleFileClick(file: any) {
  emit("file-click", file);
}

function toggleItemSelection(fileId: string) {
  emit("toggle-selection", fileId);
}

function handleSelectionChange(selectedRows: any[]) {
  const selectedIds = selectedRows.map((row) => row.id);
  const currentSelected = [...props.selectedItems];

  // Only sync file selections, don't touch folder selections
  const currentFileSelections = currentSelected.filter((id) =>
    props.files.some((file) => file.id === id)
  );

  console.log(
    "FileView handleSelectionChange - DataTable selectedIds:",
    selectedIds,
    "currentFileSelections:",
    currentFileSelections
  );

  currentFileSelections.forEach((itemId) => {
    if (!selectedIds.includes(itemId)) {
      console.log("Emitting toggle-selection to remove file:", itemId);
      emit("toggle-selection", itemId);
    }
  });

  // Add newly selected items
  selectedIds.forEach((itemId) => {
    if (!currentFileSelections.includes(itemId)) {
      console.log("Emitting toggle-selection to add file:", itemId);
      emit("toggle-selection", itemId);
    }
  });
}

// Get context menu items for files (similar to FileGrid)
function getContextMenuItems(file: any) {
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
          navigateTo(`/files/${file.id}`);
        },
      },
    ],
  ];

  // Only show delete action if user has permission
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
      <!-- Loading State - chỉ hiển thị khi loading và chưa có data -->
      <div
        v-if="(loading && files.length === 0) || !isMounted"
        class="col-span-full"
      >
        <CommonLoadingState type="card" />
      </div>

      <!-- Content - hiển thị ngay khi có data, không cần đợi isMounted -->
      <div v-else-if="transformedFiles.length > 0" key="content">
        <!-- Grid View -->
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

        <!-- List View -->
        <DataTableLazy
          v-else-if="viewMode === 'list'"
          :data="transformedFiles"
          :columns="fileColumns"
          :loading="false"
          :page-size="50"
          :selectable="!moveState.moveMode && isSelectionMode"
          :context-menu-items="
            !isSelectionMode && !moveState.moveMode
              ? getContextMenuItems
              : undefined
          "
          :selected-items="selectedItems"
          @row-click="handleFileClick"
          @selection-change="handleSelectionChange"
        />
      </div>

      <!-- Empty State - chỉ hiển thị khi không loading, không có data và đã mount -->
      <div
        v-else-if="!loading && transformedFiles.length === 0 && isMounted"
        key="empty"
        class="text-center py-12"
      >
        <UIcon
          name="lucide:file"
          class="w-16 h-16 text-muted-foreground mx-auto mb-4"
        />
        <p class="text-lg font-medium text-muted-foreground">
          {{ emptyTitle }}
        </p>
        <p class="text-sm text-muted-foreground mt-1">{{ emptyDescription }}</p>
      </div>
    </Transition>
  </div>
</template>
